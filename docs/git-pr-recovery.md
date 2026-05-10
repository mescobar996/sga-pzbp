# Guía rápida para destrabar la rama del PR

Esta guía sirve cuando estás en una rama de trabajo, por ejemplo `reportes-sga`, y Git no te deja hacer `rebase`, `pull`, `checkout` o `push` por cambios locales.

## 1. Primero mirá qué tenés pendiente

```bash
git status --short --branch
```

Si aparecen archivos con `M`, `A`, `??` o similares, Git está avisando que hay cambios locales. Antes de cambiar de rama o hacer rebase, tenés que elegir una de estas tres opciones:

- **Guardar en un commit**, si querés que esos cambios formen parte de la rama.
- **Guardar en stash**, si querés apartarlos temporalmente.
- **Descartarlos**, solo si estás seguro de que no los necesitás.

## 2. Si querés conservar los cambios en un commit

```bash
git add src/components/ReportPDF.tsx src/pages/Reportes.tsx
git commit -m "Ajusta reportes operativos"
```

Si también hay otros archivos que sí querés incluir, agregalos explícitamente con `git add ruta/del/archivo`.

## 3. Si querés apartar cambios sin commitear

```bash
git stash push -u -m "respaldo antes de rebase"
```

Después podés recuperarlos con:

```bash
git stash pop
```

## 4. Recién después intentá actualizar la rama del PR

```bash
git fetch origin
git rebase origin/main
```

Si Git dice `fatal: no rebase in progress`, no pasa nada: significa que no había un rebase activo. En ese caso no ejecutes `git rebase --continue`.

## 5. No ejecutes archivos `.tsx` en la terminal

Estos comandos son incorrectos:

```bash
src/components/ReportPDF.tsx
src/pages/Reportes.tsx
```

La terminal intenta interpretarlos como scripts de Bash y por eso aparecen errores como `import: command not found`. Para abrirlos, usá tu editor. Por ejemplo:

```bash
code src/components/ReportPDF.tsx src/pages/Reportes.tsx
```

## 6. Verificá que la app compile y pasen los tests

```bash
npm run build
npm run test:run
```

La advertencia de Vite sobre chunks grandes no bloquea el build si el comando termina con `built` y código exitoso.

## 7. Subí la rama del PR

```bash
git push --force-with-lease origin reportes-sga
```

Usá `--force-with-lease` después de un `rebase`. Es más seguro que `--force` porque evita pisar trabajo remoto que no tenés localmente.

## 8. Evitá `git pull origin main` si aparece historial no relacionado

Si `git pull origin main` devuelve:

```text
fatal: refusing to merge unrelated histories
```

no sigas por ese camino. Usá el flujo de `fetch` + `rebase` de esta guía, y confirmá que tu rama local realmente pertenezca al mismo repositorio remoto.

## 9. Checklist corto para cuando estés cansado

```bash
git status --short --branch
```

- Si hay cambios y los querés conservar: `git add ...` + `git commit ...`.
- Si hay cambios y no sabés todavía: `git stash push -u -m "respaldo"`.
- Si no hay cambios: `git fetch origin` + `git rebase origin/main`.
- Nunca escribas el nombre de un archivo `.tsx` solo en la terminal.
