// Client-side PDF parsing utility
export async function parsePDFLocally(file: File): Promise<{ text: string; pages: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const pdfData = new Uint8Array(arrayBuffer);
        
        // Dynamic import to avoid build issues
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker path for PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdf.numPages;
        
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        }
        
        resolve({
          text: fullText.trim(),
          pages: numPages
        });
      } catch (error) {
        console.error('Error parsing PDF:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Parse Excel files locally using xlsx library
export async function parseExcelLocally(file: File): Promise<{ text: string; sheets: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        
        // Dynamic import xlsx library
        const XLSX = await import('xlsx');
        
        // Read the workbook
        const workbook = XLSX.read(data, { type: 'array' });
        
        let fullText = '';
        const sheetNames: string[] = [];
        
        // Process each sheet
        workbook.SheetNames.forEach(sheetName => {
          sheetNames.push(sheetName);
          const sheet = workbook.Sheets[sheetName];
          
          // Convert to CSV format for text extraction
          const csvContent = XLSX.utils.sheet_to_csv(sheet);
          
          fullText += `\n--- Sheet: ${sheetName} ---\n${csvContent}\n`;
        });
        
        resolve({
          text: fullText.trim(),
          sheets: sheetNames
        });
      } catch (error) {
        console.error('Error parsing Excel:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Parse Word documents locally using mammoth library
export async function parseWordLocally(file: File): Promise<{ text: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Dynamic import mammoth library
        const mammoth = await import('mammoth');
        
        // Extract text from Word document
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        resolve({
          text: result.value || ''
        });
      } catch (error) {
        console.error('Error parsing Word document:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Word file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Parse CSV files locally
export async function parseCSVLocally(file: File): Promise<{ text: string; rows: number; columns: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        
        // Dynamic import papaparse library
        const Papa = await import('papaparse');
        
        // Parse CSV
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true
        });
        
        // Format as readable text
        let formattedText = '';
        
        if (result.data.length > 0) {
          // Add headers
          const firstRow = result.data[0] as Record<string, any>;
          const headers = Object.keys(firstRow);
          formattedText = headers.join(' | ') + '\n';
          formattedText += headers.map(() => '---').join(' | ') + '\n';
          
          // Add data rows
          result.data.forEach((row: any) => {
            const values = headers.map(header => row[header] || '');
            formattedText += values.join(' | ') + '\n';
          });
        } else {
          formattedText = text; // Use raw text if parsing fails
        }
        
        resolve({
          text: formattedText,
          rows: result.data.length,
          columns: result.data.length > 0 ? Object.keys(result.data[0] as Record<string, any>).length : 0
        });
      } catch (error) {
        console.error('Error parsing CSV:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
}

// Main document parser that routes to appropriate parser
export async function parseDocumentLocally(file: File): Promise<{ text: string; summary: any }> {
  const fileType = file.type;
  const fileName = file.name;
  
  console.log(`🔍 Parsing ${fileName} locally (type: ${fileType})`);
  
  try {
    let result: { text: string; [key: string]: any } = { text: '' };
    
    if (fileType === 'application/pdf') {
      const pdfResult = await parsePDFLocally(file);
      result = {
        text: pdfResult.text,
        pages: pdfResult.pages,
        type: 'PDF'
      };
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel'
    ) {
      const excelResult = await parseExcelLocally(file);
      result = {
        text: excelResult.text,
        sheets: excelResult.sheets,
        type: 'Excel'
      };
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      const wordResult = await parseWordLocally(file);
      result = {
        text: wordResult.text,
        type: 'Word'
      };
    } else if (fileType === 'text/csv') {
      // Handle CSV files
      const csvResult = await parseCSVLocally(file);
      result = {
        text: csvResult.text,
        rows: csvResult.rows,
        columns: csvResult.columns,
        type: 'CSV'
      };
    } else if (fileType === 'text/plain') {
      // Handle plain text files
      result.text = await file.text();
      result.type = 'Text';
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Limit text size
    const maxLength = 50000;
    if (result.text.length > maxLength) {
      result.text = result.text.substring(0, maxLength) + '...\n[Content truncated]';
    }
    
    const summary = {
      fileName: fileName,
      fileType: fileType,
      extractedLength: result.text.length,
      documentInfo: {
        type: result.type,
        pages: result.pages,
        sheets: result.sheets
      },
      preview: result.text.substring(0, 500) + (result.text.length > 500 ? '...' : '')
    };
    
    console.log('✅ Document parsed successfully (client-side)');
    
    return {
      text: result.text,
      summary: summary
    };
  } catch (error) {
    console.error('Error parsing document locally:', error);
    throw error;
  }
}