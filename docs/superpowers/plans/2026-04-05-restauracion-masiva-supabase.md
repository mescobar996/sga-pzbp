# Restauración Masiva Inteligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar la importación simple de datos en un sistema de restauración completa inteligente que maneje backups multi-tabla y evite duplicados mediante `upsert`.

**Architecture:** Mejora de la lógica en el componente `BaseDatos.tsx` para soportar estados de importación complejos, validación de estructura de backup y carga por lotes.

**Tech Stack:** React, Supabase JS Client, Lucide Icons.

---

### Task 1: Lógica de Detección de Backup (Multi-tabla)

**Files:**
- Modify: `src/pages/BaseDatos.tsx`

- [ ] **Step 1: Actualizar handleImportFile para detectar claves de tablas**

```typescript
// En src/pages/BaseDatos.tsx, dentro de handleImportFile (JSON case):
const data = JSON.parse(event.target?.result as string);
const knownTables = ['tasks', 'visitas', 'novedades', 'personal', 'locations', 'task_history', 'notifications', 'users'];
const detectedTables = Object.keys(data).filter(key => knownTables.includes(key));

if (detectedTables.length > 1) {
  setImportMode('multi'); // Añadir este estado
  setImportDataMap(data); // Añadir este estado
  setImportPreview(Object.entries(data).map(([k, v]) => ({ table: k, count: (v as any[]).length })));
} else {
  setImportMode('single');
  // ... lógica actual para tabla única
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BaseDatos.tsx
git commit -m "feat: add multi-table backup detection logic"
```

---

### Task 2: Motor de Restauración con Upsert

**Files:**
- Modify: `src/pages/BaseDatos.tsx`

- [ ] **Step 1: Rediseñar handleImportData para procesar tablas en orden**

```typescript
const handleImportData = async () => {
  setIsImporting(true);
  const order = ['users', 'locations', 'personal', 'tasks', 'visitas', 'novedades', 'task_history', 'notifications'];
  
  try {
    if (importMode === 'multi') {
      for (const table of order) {
        if (importDataMap[table]) {
          setImportStatus(`Cargando ${table}...`); // Visual feedback
          const { error } = await supabase.from(table).upsert(importDataMap[table], { onConflict: 'id' });
          if (error) throw error;
        }
      }
    } else {
      // Lógica de upsert para tabla única
      await supabase.from(importCollection).upsert(importPreview, { onConflict: 'id' });
    }
    toast.success('Restauración completada con éxito');
  } catch (error) {
    console.error(error);
    toast.error('Error durante la restauración');
  } finally {
    setIsImporting(false);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BaseDatos.tsx
git commit -m "feat: implement sequential upsert for database restoration"
```

---

### Task 3: Interfaz de Usuario para Restauración

**Files:**
- Modify: `src/pages/BaseDatos.tsx`

- [ ] **Step 1: Mostrar resumen de tablas detectadas en el modal**

```typescript
// En el render del modal de importación:
{importMode === 'multi' && (
  <div className="mb-4 p-3 bg-blue-50 border-2 border-[#0055ff] text-[#0055ff]">
    <p className="font-black uppercase text-xs mb-2">Backup Completo Detectado:</p>
    <ul className="text-[10px] font-bold space-y-1">
      {importPreview.map(item => (
        <li key={item.table}>• {item.table.toUpperCase()}: {item.count} registros</li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BaseDatos.tsx
git commit -m "feat: add pre-import summary to UI"
```

---

### Task 4: Validación y Pruebas Finales

- [ ] **Step 1: Realizar un Export completo y luego un Import del mismo archivo**

Verificar que no haya errores de duplicados y que las estadísticas de la Base de Datos coincidan.

- [ ] **Step 2: Commit final**

```bash
git commit --allow-empty -m "docs: finalize smart restore implementation"
```
