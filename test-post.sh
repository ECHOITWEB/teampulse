#!/bin/bash

curl -X POST https://us-central1-teampulse-61474.cloudfunctions.net/processDocumentHttp \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://firebasestorage.googleapis.com/v0/b/teampulse-61474.firebasestorage.app/o/test-cors%2F1757928988589_test.pdf?alt=media",
    "fileType": "application/pdf",
    "fileName": "test.pdf"
  }' \
  -i