// Script para exportar todos los datos de Firebase Firestore via REST API
// Ejecutar: node export-firestore-data.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'project-b8788e8d-2d5c-46f9-a80';
const DATABASE_ID = 'ai-studio-b794c53b-a898-4b3b-a5b0-4f8cfb63fa64';
const API_KEY = 'AIzaSyDtONToOsf8Qp-gIgdf-qDRdgyMnBhOZA0';

const collections = [
  'tasks',
  'visitas',
  'novedades',
  'personal',
  'locations',
  'task_history',
  'notifications',
  'users'
];

function firestoreGet(collectionName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collectionName}?key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function convertFirestoreValue(value) {
  if (!value) return null;
  const type = Object.keys(value)[0];
  const val = value[type];
  
  switch (type) {
    case 'stringValue': return val;
    case 'integerValue': return parseInt(val);
    case 'doubleValue': return parseFloat(val);
    case 'booleanValue': return val;
    case 'timestampValue': return new Date(val).toISOString();
    case 'nullValue': return null;
    case 'arrayValue': 
      return (val.values || []).map(item => convertFirestoreValue(item));
    case 'mapValue':
      const obj = {};
      if (val.fields) {
        Object.entries(val.fields).forEach(([key, v]) => {
          obj[key] = convertFirestoreValue(v);
        });
      }
      return obj;
    case 'referenceValue': return val;
    default: return val;
  }
}

function convertDocument(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  // Extract document ID from name
  const nameParts = doc.name.split('/');
  result.id = nameParts[nameParts.length - 1];
  
  Object.entries(doc.fields).forEach(([key, value]) => {
    result[key] = convertFirestoreValue(value);
  });
  
  return result;
}

async function exportAllData() {
  const outputDir = path.join(__dirname, 'firestore-export');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const summary = {};

  for (const colName of collections) {
    try {
      console.log(`\n📥 Exportando: ${colName}...`);
      const result = await firestoreGet(colName);
      
      if (!result || !result.documents) {
        console.log(`   ⚠️  Sin documentos`);
        summary[colName] = 0;
        fs.writeFileSync(path.join(outputDir, `${colName}.json`), '[]', 'utf8');
        continue;
      }

      const docs = result.documents.map(doc => convertDocument(doc));
      summary[colName] = docs.length;
      console.log(`   ✅ ${docs.length} documentos encontrados`);

      const filePath = path.join(outputDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`   💾 Guardado en: ${filePath}`);
    } catch (error) {
      console.error(`   ❌ Error exportando ${colName}:`, error.message);
      summary[colName] = 0;
    }
  }

  // Guardar resumen
  const summaryPath = path.join(outputDir, 'RESUMEN.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    fecha: new Date().toISOString(),
    proyecto: PROJECT_ID,
    firestoreDatabaseId: DATABASE_ID,
    resumen: summary,
    total: Object.values(summary).reduce((a, b) => a + b, 0)
  }, null, 2), 'utf8');

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE EXPORTACIÓN');
  console.log('='.repeat(50));
  Object.entries(summary).forEach(([col, count]) => {
    console.log(`   ${col}: ${count} documentos`);
  });
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  console.log(`\n   TOTAL: ${total} documentos`);
  console.log(`\n📁 Archivos guardados en: ${outputDir}`);
  console.log('='.repeat(50));
}

exportAllData().catch(console.error);
