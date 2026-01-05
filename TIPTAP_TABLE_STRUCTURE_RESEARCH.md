# TipTap 3.14.0 Table Extension - HTML Structure & Column Resize Research

## Executive Summary

**YES** - TipTap 3.14.0 Table extension **AUTOMATICALLY GENERATES** `<colgroup>` and `<col>` elements for column width management. You do **NOT** need to add them manually. The extension has built-in support for table resizing when properly configured.

---

## Key Findings

### 1. **Automatic colgroup/col Generation**

TipTap generates column structure automatically through the `createColGroup()` utility:

- **When**: During table rendering (both in HTML output and editor view)
- **Where**: Generated in the `renderHTML()` method of the Table extension
- **Structure**: Creates a `<colgroup>` element containing `<col>` elements for each column

**Source Evidence:**
```typescript
// From: createColGroup.ts
export function createColGroup(node: ProseMirrorNode, cellMinWidth: number): ColGroup {
  const cols: DOMOutputSpec[] = []
  const row = node.firstChild
  
  if (!row) {
    return {}
  }

  for (let i = 0, col = 0; i < row.childCount; i += 1) {
    const { colspan, colwidth } = row.child(i).attrs
    
    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = colwidth && (colwidth[j] as number | undefined)
      cols.push(['col', { style: `${property}: ${value}` }])
    }
  }

  const colgroup: DOMOutputSpec = ['colgroup', {}, ...cols]
  return { colgroup, tableWidth, tableMinWidth }
}
```

### 2. **HTML Output Structure**

The table renders with this structure when `renderHTML()` is called:

```html
<table style="width: 600px">
  <colgroup>
    <col style="width: 200px">
    <col style="width: 200px">
    <col style="width: 200px">
  </colgroup>
  <tbody>
    <tr>
      <td>Cell 1</td>
      <td>Cell 2</td>
      <td>Cell 3</td>
    </tr>
  </tbody>
</table>
```

**OR** if widths aren't fixed:

```html
<table style="min-width: 600px">
  <colgroup>
    <col style="min-width: 25px">
    <col style="min-width: 25px">
    <col style="min-width: 25px">
  </colgroup>
  <tbody>
    ...
  </tbody>
</table>
```

### 3. **Column Width Management**

The `colStyle.ts` utility determines what CSS property to apply:

```typescript
export function getColStyleDeclaration(minWidth: number, width: number | undefined): [string, string] {
  if (width) {
    // apply the stored width unless it is below the configured minimum cell width
    return ['width', `${Math.max(width, minWidth)}px`]
  }

  // set the minimum width on the column if it has no stored width
  return ['min-width', `${minWidth}px`]
}
```

**Logic:**
- If a column has a **stored width**: Apply `width: Xpx`
- If a column has **no stored width**: Apply `min-width: cellMinWidthpx`

### 4. **Table Resize Configuration Options**

The Table extension accepts these configuration options for resizing:

```typescript
interface TableOptions {
  // Enable/disable the resize feature
  resizable: boolean  // default: false
  
  // Minimum width for each cell
  cellMinWidth: number  // default: 25px
  
  // Width of the resize handle
  handleWidth: number  // default: 5px
  
  // Whether the last column can be resized
  lastColumnResizable: boolean  // default: true
  
  // Custom node view class (advanced)
  View: NodeView | null  // default: TableView
  
  // Wrap table in div.tableWrapper
  renderWrapper: boolean  // default: false
}
```

### 5. **Current Configuration in Your Project**

In [TiptapEditor.tsx](apps/web/src/components/TiptapEditor/TiptapEditor.tsx#L220):

```typescript
Table.configure({
  resizable: true,                    // ✅ Resize enabled
  allowTableNodeSelection: true,      // Allow selecting entire table
  lastColumnResizable: true,          // Last column can be resized
  cellMinWidth: 50,                   // Minimum cell width 50px
  HTMLAttributes: {
    class: 'tiptap-table',
  },
}),
```

**Status**: Your configuration is correctly set up for resizing! ✅

---

## The TableView Class

When resizing is enabled, TipTap uses the `TableView` class to manage the table DOM:

```typescript
export class TableView implements NodeView {
  node: ProseMirrorNode
  cellMinWidth: number
  dom: HTMLDivElement           // Wrapper div
  table: HTMLTableElement       // The <table>
  colgroup: HTMLTableColElement // The <colgroup>
  contentDOM: HTMLTableSectionElement // The <tbody>

  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    this.dom = document.createElement('div')
    this.dom.className = 'tableWrapper'
    this.table = this.dom.appendChild(document.createElement('table'))
    this.colgroup = this.table.appendChild(document.createElement('colgroup'))
    updateColumns(node, this.colgroup, this.table, cellMinWidth)
    this.contentDOM = this.table.appendChild(document.createElement('tbody'))
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) {
      return false
    }
    this.node = node
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth)
    return true
  }
}
```

**Key Points:**
1. Creates a wrapper `<div class="tableWrapper">`
2. Creates `<table>` element
3. Creates and populates `<colgroup>` with `<col>` elements
4. Creates `<tbody>` for content
5. Updates columns whenever the table node changes

---

## The updateColumns() Function

This function is called both during initialization and on updates to maintain the colgroup:

```typescript
export function updateColumns(
  node: ProseMirrorNode,
  colgroup: HTMLTableColElement,
  table: HTMLTableElement,
  cellMinWidth: number,
  overrideCol?: number,
  overrideValue?: number,
) {
  let totalWidth = 0
  let fixedWidth = true
  let nextDOM = colgroup.firstChild
  const row = node.firstChild

  if (row !== null) {
    for (let i = 0, col = 0; i < row.childCount; i += 1) {
      const { colspan, colwidth } = row.child(i).attrs

      for (let j = 0; j < colspan; j += 1, col += 1) {
        const hasWidth = overrideCol === col ? overrideValue : ((colwidth && colwidth[j]) as number | undefined)
        const cssWidth = hasWidth ? `${hasWidth}px` : ''

        totalWidth += hasWidth || cellMinWidth

        if (!hasWidth) {
          fixedWidth = false
        }

        if (!nextDOM) {
          // Create new col element if needed
          const colElement = document.createElement('col')
          const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth)
          colElement.style.setProperty(propertyKey, propertyValue)
          colgroup.appendChild(colElement)
        } else {
          // Update existing col element
          if ((nextDOM as HTMLTableColElement).style.width !== cssWidth) {
            const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth)
            ;(nextDOM as HTMLTableColElement).style.setProperty(propertyKey, propertyValue)
          }
          nextDOM = nextDOM.nextSibling
        }
      }
    }
  }

  // Remove extra col elements
  while (nextDOM) {
    const after = nextDOM.nextSibling
    nextDOM.parentNode?.removeChild(nextDOM)
    nextDOM = after
  }

  // Update table width styles
  if (fixedWidth && !hasUserWidth) {
    table.style.width = `${totalWidth}px`
    table.style.minWidth = ''
  } else {
    table.style.width = ''
    table.style.minWidth = `${totalWidth}px`
  }
}
```

**What it does:**
1. Iterates through table rows and cells
2. Creates or updates `<col>` elements in `<colgroup>`
3. Sets appropriate width or min-width styles
4. Updates table width/min-width based on whether all columns have fixed widths
5. Cleans up extra `<col>` elements if columns were deleted

---

## HTML Generation Flow

### During HTML Output (renderHTML):

```typescript
renderHTML({ node, HTMLAttributes }) {
  const { colgroup, tableWidth, tableMinWidth } = createColGroup(
    node, 
    this.options.cellMinWidth
  )

  const table: DOMOutputSpec = [
    'table',
    mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      style: getTableStyle(),
    }),
    colgroup,        // ← COLGROUP IS INSERTED HERE
    ['tbody', 0],
  ]

  return this.options.renderWrapper ? 
    ['div', { class: 'tableWrapper' }, table] : 
    table
}
```

### During Editor View (with resizable enabled):

The `TableView` class directly creates DOM elements and manages the colgroup.

---

## Column Width Storage

Column widths are stored in the **cell attributes** as `colwidth` array:

```typescript
// In table cell node attributes
{
  colspan: 1,
  rowspan: 1,
  colwidth: [200]  // ← Width stored here
}
```

When resizing happens:
1. User drags the resize handle
2. The `columnResizing` plugin (from `@tiptap/pm/tables`) updates the `colwidth` attribute
3. `updateColumns()` is called to sync the DOM
4. The `<col style="width: 200px">` element is updated

---

## Resize Functionality Requirements

For table column resizing to work, you need:

### 1. **Configuration**
```typescript
Table.configure({
  resizable: true,        // Enable resizing
  cellMinWidth: 50,       // Set minimum cell width
  lastColumnResizable: true  // Allow last column resize
})
```

### 2. **Correct HTML Structure**
- ✅ `<colgroup>` with `<col>` elements (generated automatically)
- ✅ `<tbody>` with proper cell structure (generated automatically)
- ✅ Wrapper `<div class="tableWrapper">` (created by TableView when resizable: true)

### 3. **ProseMirror Plugins** (auto-included)
From `@tiptap/pm/tables`:
- `columnResizing` - Handles resize drag interactions
- `tableEditing` - Handles table cell selection and editing

### 4. **CSS for Resize Handle**
TipTap includes built-in styling for the resize handle, but you may need to ensure your CSS doesn't override it.

---

## Type Definitions

```typescript
// The ColGroup return type
type ColGroup = 
  | {
      colgroup: DOMOutputSpec
      tableWidth: string
      tableMinWidth: string
    }
  | Record<string, never>

// Exported utilities
export function createColGroup(
  node: ProseMirrorNode, 
  cellMinWidth: number
): ColGroup

export function createColGroup(
  node: ProseMirrorNode, 
  cellMinWidth: number,
  overrideCol: number,
  overrideValue: number
): ColGroup

export function updateColumns(
  node: ProseMirrorNode,
  colgroup: HTMLTableColElement,
  table: HTMLTableElement,
  cellMinWidth: number,
  overrideCol?: number,
  overrideValue?: number
): void

export class TableView implements NodeView {
  // ... implementation
}
```

---

## Debug Information from Your Code

Your [TiptapEditor.tsx](apps/web/src/components/TiptapEditor/TiptapEditor.tsx#L463) already checks for colgroup:

```typescript
console.log('TABLE STRUCTURE DEBUG:', {
  hasColgroup: !!tableElement.querySelector('colgroup'),
  colElements: tableElement.querySelectorAll('col').length,
  tableHTML: tableElement.outerHTML.substring(0, 500),
  innerElements: {
    colgroup: tableElement.querySelector('colgroup')?.outerHTML,
    firstCol: tableElement.querySelector('col')?.outerHTML,
    firstCell: tableElement.querySelector('td, th')?.outerHTML,
  }
});
```

This is good for debugging! When `resizable: true`, you should see:
- `hasColgroup: true` ✅
- `colElements: > 0` ✅

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Generates colgroup/col?** | YES ✅ Automatically |
| **When generated?** | During `renderHTML()` and in `TableView` |
| **Configuration needed?** | `resizable: true` to enable full functionality |
| **Manual colgroup/col needed?** | NO ❌ Do not add manually |
| **Column width source** | Stored in cell `colwidth` attribute |
| **Resize handle management** | Handled by `columnResizing` plugin from `@tiptap/pm/tables` |
| **CSS needed?** | No special CSS required (included with TipTap) |
| **Cell min width** | Configurable via `cellMinWidth` option (default 25px, yours: 50px) |
| **Last column resizable?** | Configurable via `lastColumnResizable` (default true) |

---

## Recommendations for Your Implementation

1. **Keep `resizable: true`** - You have it configured correctly ✅

2. **Verify the colgroup is present** - Your debug logging is good:
   ```typescript
   const hasColgroup = !!tableElement.querySelector('colgroup');
   console.log('Colgroup present:', hasColgroup); // Should be true
   ```

3. **Don't manually create colgroup** - Let TipTap handle it. Any manual colgroup you create may conflict with TipTap's management.

4. **Use `updateColumns()` if extending** - If you need custom resize behavior:
   ```typescript
   import { updateColumns } from '@tiptap/extension-table';
   
   // After making changes to column widths
   const tableElement = editor.view.nodeDOM(tablePos);
   const colgroup = tableElement?.querySelector('colgroup');
   
   if (colgroup && tableElement) {
     updateColumns(node, colgroup, tableElement, cellMinWidth);
   }
   ```

5. **Handle column width updates** - When resizing happens, TipTap automatically:
   - Updates the cell's `colwidth` attribute
   - Updates the `<col>` element's style
   - Updates the table's width/min-width

6. **Test resize functionality** - Make sure:
   - Resize handles appear between columns
   - Dragging handles changes column widths
   - Column widths persist when you reload the document

---

## Key Files Reference

- **Main Table Extension**: `@tiptap/extension-table/src/table/table.ts`
- **Column Group Creation**: `@tiptap/extension-table/src/table/utilities/createColGroup.ts`
- **Column Style**: `@tiptap/extension-table/src/table/utilities/colStyle.ts`
- **Table View**: `@tiptap/extension-table/src/table/TableView.ts`
- **Your Configuration**: [TiptapEditor.tsx](apps/web/src/components/TiptapEditor/TiptapEditor.tsx#L220)

---

## Conclusion

**TipTap 3.14.0 handles all aspects of HTML table structure generation automatically.** You do NOT need to manually create `<colgroup>` and `<col>` elements. The extension:

1. ✅ Automatically generates `<colgroup>` with `<col>` elements
2. ✅ Manages column widths through cell attributes
3. ✅ Updates the DOM when columns are resized
4. ✅ Includes built-in resize handles and interaction
5. ✅ Your configuration is correct for enabling resize

Focus on using TipTap's API to manipulate tables, and let it handle the HTML structure for you.
