const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// CORS 설정 - 모든 origin 허용 (프로덕션에서는 특정 도메인만 허용하도록 수정 필요)
const cors = require('cors')({ 
  origin: true, // 모든 origin 허용
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey'],
  exposedHeaders: ['Content-Length', 'Content-Type']
});

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Helper function to convert image URL to base64
exports.convertImageToBase64 = functions
  .runWith({ 
    memory: '1GB', 
    timeoutSeconds: 60,
    cors: true
  })
  .https.onCall(async (data, context) => {
    const { imageUrl } = data;
    
    if (!imageUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Image URL is required');
    }
    
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();
      
      // Convert to base64
      const base64 = buffer.toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      return {
        success: true,
        dataUrl: dataUrl,
        mimeType: mimeType
      };
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new functions.https.HttpsError(
        'internal', 
        `Failed to convert image: ${error.message}`
      );
    }
  });

// Document processing for PDF, Excel, HTML files
exports.processDocument = functions
  .runWith({ 
    memory: '1GB', 
    timeoutSeconds: 540
  })
  .https.onCall(async (data, context) => {
    const { fileUrl, fileType, fileName } = data;

    if (!fileUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'File URL is required');
    }

    try {
      let extractedText = '';
      let documentInfo = {};

      // Download the file from Firebase Storage
      const response = await fetch(fileUrl);
      const buffer = await response.buffer();

      // Process based on file type
      if (fileType === 'application/pdf') {
        // For PDF files, we'll use pdf-parse
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        
        extractedText = pdfData.text;
        documentInfo = {
          pages: pdfData.numpages,
          info: pdfData.info,
          metadata: pdfData.metadata,
          version: pdfData.version
        };
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 fileType === 'application/vnd.ms-excel') {
        // For Excel files, use xlsx
        const XLSX = require('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        // Extract text from all sheets
        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          sheets[sheetName] = XLSX.utils.sheet_to_csv(sheet);
        });
        
        extractedText = Object.entries(sheets)
          .map(([name, content]) => `Sheet: ${name}\n${content}`)
          .join('\n\n');
        
        documentInfo = {
          sheetNames: workbook.SheetNames,
          sheetCount: workbook.SheetNames.length
        };
      } else if (fileType === 'text/html') {
        // For HTML files, extract text content
        const cheerio = require('cheerio');
        const html = buffer.toString('utf-8');
        const $ = cheerio.load(html);
        
        // Remove script and style elements
        $('script').remove();
        $('style').remove();
        
        // Extract text
        extractedText = $.text().trim();
        
        // Extract metadata
        documentInfo = {
          title: $('title').text() || 'No title',
          metaTags: {}
        };
        
        $('meta').each((i, elem) => {
          const name = $(elem).attr('name') || $(elem).attr('property');
          const content = $(elem).attr('content');
          if (name && content) {
            documentInfo.metaTags[name] = content;
          }
        });
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 fileType === 'application/msword') {
        // For Word documents, use mammoth
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: buffer });
        
        extractedText = result.value;
        documentInfo = {
          messages: result.messages
        };
      } else if (fileType === 'text/plain' || fileType === 'text/csv') {
        // For plain text and CSV files
        extractedText = buffer.toString('utf-8');
        documentInfo = {
          size: buffer.length,
          encoding: 'utf-8'
        };
      } else {
        // Unsupported file type
        throw new functions.https.HttpsError(
          'invalid-argument', 
          `File type ${fileType} is not supported for text extraction`
        );
      }

      // Limit text size to prevent issues
      const maxLength = 50000; // 50k characters
      if (extractedText.length > maxLength) {
        extractedText = extractedText.substring(0, maxLength) + '...\n[Content truncated]';
      }

      // Create a summary
      const summary = {
        fileName: fileName || 'Unknown file',
        fileType: fileType,
        extractedLength: extractedText.length,
        documentInfo: documentInfo,
        preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
      };

      return {
        success: true,
        text: extractedText,
        summary: summary
      };

    } catch (error) {
      console.error('Error processing document:', error);
      throw new functions.https.HttpsError(
        'internal', 
        `Failed to process document: ${error.message}`
      );
    }
  });

// HTTP version of processDocument with explicit CORS handling
exports.processDocumentHttp = functions
  .runWith({ 
    memory: '1GB', 
    timeoutSeconds: 540
  })
  .https.onRequest((req, res) => {
    // Handle CORS
    cors(req, res, async () => {
      // Only allow POST requests
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      try {
        const { fileUrl, fileType, fileName } = req.body;

        if (!fileUrl) {
          res.status(400).json({ 
            error: 'File URL is required' 
          });
          return;
        }

        console.log('🔍 Processing document (HTTP):', { fileName, fileType, fileUrl });
        
        let extractedText = '';
        let documentInfo = {};

        // Download the file from Firebase Storage
        const response = await fetch(fileUrl);
        const buffer = await response.buffer();

        // Process based on file type
        if (fileType === 'application/pdf') {
          // For PDF files, we'll use pdf-parse
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(buffer);
          
          extractedText = pdfData.text;
          documentInfo = {
            pages: pdfData.numpages,
            info: pdfData.info,
            metadata: pdfData.metadata,
            version: pdfData.version
          };
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                   fileType === 'application/vnd.ms-excel') {
          // For Excel files, use xlsx
          const XLSX = require('xlsx');
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          
          // Extract text from all sheets
          const sheets = {};
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            sheets[sheetName] = XLSX.utils.sheet_to_csv(sheet);
          });
          
          extractedText = Object.entries(sheets)
            .map(([name, content]) => `Sheet: ${name}\n${content}`)
            .join('\n\n');
          
          documentInfo = {
            sheetNames: workbook.SheetNames,
            sheetCount: workbook.SheetNames.length
          };
        } else if (fileType === 'text/html') {
          // For HTML files, extract text content
          const cheerio = require('cheerio');
          const html = buffer.toString('utf-8');
          const $ = cheerio.load(html);
          
          // Remove script and style elements
          $('script').remove();
          $('style').remove();
          
          // Extract text
          extractedText = $.text().trim();
          
          // Extract metadata
          documentInfo = {
            title: $('title').text() || 'No title',
            metaTags: {}
          };
          
          $('meta').each((i, elem) => {
            const name = $(elem).attr('name') || $(elem).attr('property');
            const content = $(elem).attr('content');
            if (name && content) {
              documentInfo.metaTags[name] = content;
            }
          });
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   fileType === 'application/msword') {
          // For Word documents, use mammoth
          const mammoth = require('mammoth');
          const result = await mammoth.extractRawText({ buffer: buffer });
          
          extractedText = result.value;
          documentInfo = {
            messages: result.messages
          };
        } else if (fileType === 'text/plain' || fileType === 'text/csv') {
          // For plain text and CSV files
          extractedText = buffer.toString('utf-8');
          documentInfo = {
            size: buffer.length,
            encoding: 'utf-8'
          };
        } else {
          // Unsupported file type
          res.status(400).json({ 
            error: `File type ${fileType} is not supported for text extraction` 
          });
          return;
        }

        // Limit text size to prevent issues
        const maxLength = 50000; // 50k characters
        if (extractedText.length > maxLength) {
          extractedText = extractedText.substring(0, maxLength) + '...\n[Content truncated]';
        }

        // Create a summary
        const summary = {
          fileName: fileName || 'Unknown file',
          fileType: fileType,
          extractedLength: extractedText.length,
          documentInfo: documentInfo,
          preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
        };

        console.log('✅ Document processed successfully (HTTP)');
        
        res.status(200).json({
          data: {
            success: true,
            text: extractedText,
            summary: summary
          }
        });

      } catch (error) {
        console.error('Error processing document (HTTP):', error);
        res.status(500).json({ 
          error: `Failed to process document: ${error.message}` 
        });
      }
    });
  });