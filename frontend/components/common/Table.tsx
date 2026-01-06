import React, { useMemo, useState, useRef, useEffect } from 'react'

type TableStyles = {
  headRow?: string
  headCell?: string
  elementRow?: string
  elementCell?: string
}

type TableColx = {
  [colName: string]: {
    head?: string
    cells?: string
  }
}

// Extended renderer for cell or head:
// - cell: (val, row) or ([vals...], row)
// - head: (isHead = true) can receive special param if needed
type TableRenderers = {
  [column: string]:
    | ((val: any, row?: any, opts?: { isHead?: boolean }) => JSX.Element)
    | ((vals: any[], row?: any, opts?: { isHead?: boolean }) => JSX.Element)
}

// Edit renderer type with edit-specific options
type EditRenderers = {
  [column: string]: (
    val: any,
    row?: any,
    opts?: {
      isEditing?: boolean
      onChange?: (newValue: any) => void
      onBlur?: () => void
      onKeyDown?: (e: React.KeyboardEvent) => void
    },
  ) => JSX.Element
}

type CombinedCol = {
  cols: string[]
  name: string
  render: (values: any[], row?: any) => JSX.Element
  // Optional: header renderer for the combo
  headRender?: (opts?: { isHead?: boolean }) => JSX.Element
}

// Helper to extract minWidth/maxWidth/width from a style string like "w-24! min-w-48!"
function extractPxFromColx(
  colx: string,
): Partial<{ width?: number; minWidth?: number; maxWidth?: number }> {
  // Looks for w-<number>!, min-w-<number>!, max-w-<number>!
  if (!colx) return {}
  let ret: Partial<{ width?: number; minWidth?: number; maxWidth?: number }> = {}
  const pxFrom = (s: string) => {
    // Support suffixes: px, by default assume px
    if (!s) return undefined
    const n = parseInt(s, 10)
    if (!isNaN(n)) return n
    return undefined
  }
  // Regexp for Tailwind enforced width/height: w-48!, min-w-24!
  const matchers: [RegExp, (v: string) => void][] = [
    [
      /w-(\d+)!/,
      (v: string) => {
        ret.width = pxFrom(v)
      },
    ],
    [
      /min-w-(\d+)!/,
      (v: string) => {
        ret.minWidth = pxFrom(v)
      },
    ],
    [
      /max-w-(\d+)!/,
      (v: string) => {
        ret.maxWidth = pxFrom(v)
      },
    ],
  ]
  for (const [re, fn] of matchers) {
    const m = colx.match(re)
    if (m && m[1]) fn(m[1])
  }
  return ret
}

export const Table = ({
  data,
  EmptyFallback,
  styles = {},
  renderers = {},
  collsStyles = {},
  colOrder,
  excludeCols = [],
  combinedCols = [],
  className = '',
  showHead = true,
  onRowClick,
  autoWidth = false,
  minColWidth = 48,
  maxColWidth = 400,
  headRenderers = {},
  onChange,
  editableCols,
  editCellStyles = {},
  editRenderers = {},
  originalData,
  changedCellStyles = {},
}: {
  data: any[]
  EmptyFallback?: JSX.Element
  styles?: TableStyles
  renderers?: TableRenderers
  colOrder?: string[]
  excludeCols?: string[]
  combinedCols?: CombinedCol[]
  collsStyles?: TableColx
  className?: string
  showHead?: boolean
  onRowClick?: (row: any, rowIdx: number) => void
  autoWidth?: boolean
  minColWidth?: number
  maxColWidth?: number
  headRenderers?: {
    [column: string]: (() => JSX.Element) | ((opts?: { isHead?: boolean }) => JSX.Element)
  }
  onChange?: (rowIdx: number, colName: string, newValue: any, oldValue: any) => void
  editableCols?: string[]
  editCellStyles?: TableColx
  editRenderers?: EditRenderers
  originalData?: any[]
  changedCellStyles?: TableColx
}) => {
  // State for tracking which cells are being edited: Map<`${rowIdx}-${colName}`, editValue>
  const [editingCells, setEditingCells] = useState<Map<string, any>>(new Map())
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map())

  // Focus input when entering edit mode
  useEffect(() => {
    // Focus the most recently added cell
    if (inputRefs.current.size > 0) {
      const lastKey = Array.from(inputRefs.current.keys()).pop()
      if (lastKey && inputRefs.current.get(lastKey)) {
        const input = inputRefs.current.get(lastKey)
        if (input) {
          input.focus()
          input.select()
        }
      }
    }
  }, [editingCells])

  // Helper to check if a column is editable
  const isEditable = (colName: string) => {
    if (!onChange) return false
    if (editableCols === undefined) return true // All columns editable if not specified
    return editableCols.includes(colName)
  }

  // Helper to check if a cell has changed from original data
  const isCellChanged = (rowIdx: number, colName: string, currentValue: any): boolean => {
    if (!originalData || !originalData[rowIdx]) return false
    const originalValue = originalData[rowIdx][colName]
    // Deep comparison for objects/arrays, simple comparison for primitives
    if (typeof currentValue === 'object' && currentValue !== null) {
      return JSON.stringify(currentValue) !== JSON.stringify(originalValue)
    }
    return currentValue !== originalValue
  }

  // Helper to get cell key
  const getCellKey = (rowIdx: number, colName: string) => `${rowIdx}-${colName}`

  // Handle click to enter edit mode
  const handleCellClick = (rowIdx: number, colName: string, currentValue: any) => {
    if (isEditable(colName)) {
      const cellKey = getCellKey(rowIdx, colName)
      setEditingCells((prev) => {
        const newMap = new Map(prev)
        newMap.set(cellKey, currentValue)
        return newMap
      })
    }
  }

  // Handle saving the edited value for a specific cell
  const handleSaveEdit = (rowIdx: number, colName: string) => {
    const cellKey = getCellKey(rowIdx, colName)
    const editValue = editingCells.get(cellKey)
    if (editValue !== undefined && onChange) {
      const oldValue = data[rowIdx]?.[colName]
      onChange(rowIdx, colName, editValue, oldValue)
      setEditingCells((prev) => {
        const newMap = new Map(prev)
        newMap.delete(cellKey)
        return newMap
      })
      inputRefs.current.delete(cellKey)
    }
  }

  // Handle canceling edit for a specific cell
  const handleCancelEdit = (rowIdx: number, colName: string) => {
    const cellKey = getCellKey(rowIdx, colName)
    setEditingCells((prev) => {
      const newMap = new Map(prev)
      newMap.delete(cellKey)
      return newMap
    })
    inputRefs.current.delete(cellKey)
  }

  // Handle key press in edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent, rowIdx: number, colName: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit(rowIdx, colName)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit(rowIdx, colName)
    }
  }

  if (data.length === 0) {
    if (EmptyFallback) {
      return EmptyFallback
    } else {
      return (
        <div className="w-full h-full bg-neutral-800 rounded flex items-center justify-center">
          No Data
        </div>
      )
    }
  }

  function capitalizeFirstLetter(string: string) {
    if (string.length === 0) {
      return string // Handle empty strings
    }
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  const dataFields = Object.keys(data.at(0)).filter((k) => !excludeCols.includes(k))
  const combinedColSources = new Set<string>()
  if (combinedCols) {
    for (const combo of combinedCols) {
      combo.cols.forEach((c) => combinedColSources.add(c))
    }
  }

  let Head: { name: string; combo?: CombinedCol }[]
  if (colOrder && colOrder.length > 0) {
    Head = []
    let usedComboColNames = new Set<string>()
    let usedFields = new Set<string>()
    const comboMap = new Map<string, CombinedCol>()
    if (combinedCols) {
      for (const c of combinedCols) {
        comboMap.set(c.name, c)
      }
    }
    for (const col of colOrder) {
      const comboDef = comboMap.get(col)
      if (comboDef && !usedComboColNames.has(comboDef.name)) {
        Head.push({ name: comboDef.name, combo: comboDef })
        usedComboColNames.add(comboDef.name)
        comboDef.cols.forEach((c) => usedFields.add(c))
      } else if (dataFields.includes(col) && !combinedColSources.has(col) && !usedFields.has(col)) {
        Head.push({ name: col })
        usedFields.add(col)
      }
    }
    for (const k of dataFields) {
      if (!usedFields.has(k) && !combinedColSources.has(k)) {
        Head.push({ name: k })
        usedFields.add(k)
      }
    }
    if (combinedCols) {
      for (const combo of combinedCols) {
        if (!usedComboColNames.has(combo.name)) {
          Head.push({ name: combo.name, combo })
          usedComboColNames.add(combo.name)
        }
      }
    }
  } else {
    Head = []
    let usedComboColNames = new Set()
    if (combinedCols) {
      for (const combo of combinedCols) {
        Head.push({ name: combo.name, combo })
        usedComboColNames.add(combo.name)
      }
    }
    for (const k of dataFields) {
      if (!combinedColSources.has(k)) {
        Head.push({ name: k })
      }
    }
  }

  const colWidths = useMemo(() => {
    if (!autoWidth) return undefined
    const charWidth = 8
    const pxPad = 24

    function maxLen(strArr: string[]) {
      return Math.max(0, ...strArr.map((s) => (s ?? '').length))
    }

    let result: Record<string, number> = {}
    for (const h of Head) {
      let allColStrings: string[] = []
      if (h.combo) {
        for (let i = 0; i < data.length; ++i) {
          const vals = h.combo.cols.map((c) => data[i][c])
          allColStrings.push(
            vals
              .map((v) =>
                typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v),
              )
              .join(' '),
          )
        }
      } else {
        for (let i = 0; i < data.length; ++i) {
          let v = data[i][h.name]
          if (typeof v === 'string' || typeof v === 'number') allColStrings.push(String(v))
          else allColStrings.push(JSON.stringify(v))
        }
      }
      allColStrings.push(capitalizeFirstLetter(h.name))
      let maxlen = maxLen(allColStrings)
      let px = pxPad + charWidth * maxlen

      if (px < minColWidth) px = minColWidth
      if (px > maxColWidth) px = maxColWidth
      result[h.name] = px
    }
    return result
  }, [autoWidth, Head, data, minColWidth, maxColWidth])

  // Function to resolve style object for a cell or head,
  // prioritizing collStyles over autoWidth colWidths
  function resolveStyle(
    colType: 'head' | 'cell',
    colName: string,
  ): React.CSSProperties | undefined {
    let styleObj: React.CSSProperties | undefined = undefined
    // First, try from collsStyles. If it's present (e.g. 'w-48! min-w-24!'), try to extract px values
    let colx = collsStyles?.[colName]?.[colType === 'head' ? 'head' : 'cells'] || ''
    let pxs = extractPxFromColx(colx)

    // Always respect collStyles! If width/minWidth/maxWidth found, always set
    if (Object.keys(pxs).length > 0) {
      styleObj = { ...pxs }
    }
    // If not set in collStyles and autoWidth on, fallback to auto colWidths
    if (
      (!styleObj || Object.keys(styleObj).length === 0) &&
      autoWidth &&
      colWidths &&
      colWidths[colName]
    ) {
      styleObj = {
        minWidth: colWidths[colName],
        maxWidth: colWidths[colName],
        width: colWidths[colName],
      }
    }
    return styleObj
  }

  return (
    <div className={`flex w-full flex-col h-full ${className ? ' ' + className : ''}`}>
      {/* Head */}
      {showHead !== false && (
        <div
          className={`flex h-fit sticky top-0 border-b w-full${styles.headRow ? ' ' + styles.headRow : ''}`}
        >
          {Head.map((h) => {
            const colxHead = (collsStyles && collsStyles[h.name]?.head) || ''
            const styleObj = resolveStyle('head', h.name)

            // ---- SUPPORT HEAD RENDERERS ----
            // 1. Combined col with internal headRender
            // 2. headRenderers[prop] supplied by user
            // 3. renderers[prop] with isHead
            // 4. fallback to label

            let headContent: React.ReactNode = null
            if (h.combo && typeof h.combo.headRender === 'function') {
              // combined column with its own head renderer
              headContent = h.combo.headRender({ isHead: true })
            } else if (headRenderers && typeof headRenderers[h.name] === 'function') {
              // explicitly specified head renderer
              headContent = headRenderers[h.name]!({ isHead: true })
            } else if (
              renderers &&
              typeof renderers[h.name] === 'function' &&
              // try to use renderer in head mode
              (renderers[h.name] as any).length >= 3 // support (val, row, opts)
            ) {
              headContent = (renderers[h.name] as any)(undefined, undefined, { isHead: true })
            } else {
              headContent = capitalizeFirstLetter(h.name)
            }

            return (
              <div
                className={`w-full p-1 px-2 text-sm font-[Code]${styles.headCell ? ' ' + styles.headCell : ''}${colxHead ? ' ' + colxHead : ''}`}
                key={h.name}
                style={styleObj}
              >
                {headContent}
              </div>
            )
          })}
        </div>
      )}
      <div className="flex flex-col w-full h-full">
        {/* Body */}
        {data.map((d, rowIdx) => (
          <div
            className={`flex h-fit  w-full${styles.elementRow ? ' ' + styles.elementRow : ''} ${onRowClick ? 'cursor-pointer hover:bg-neutral-900' : ''}`}
            key={rowIdx}
            onClick={onRowClick ? () => onRowClick(d, rowIdx) : undefined}
          >
            {Head.map((fieldDesc) => {
              const cellKey = getCellKey(rowIdx, fieldDesc.name)
              const isEditing = editingCells.has(cellKey)
              const editValue = editingCells.get(cellKey)

              // Check if cell has changed from original data
              const cellChanged =
                !isEditing && isCellChanged(rowIdx, fieldDesc.name, d[fieldDesc.name])

              // Get styles: use edit styles if editing, otherwise check for changed styles, then normal styles
              // Support wildcard '*' for editCellStyles and changedCellStyles
              let editCellStyle = ''
              if (isEditing && editCellStyles) {
                editCellStyle =
                  editCellStyles[fieldDesc.name]?.cells || editCellStyles['*']?.cells || ''
              }

              let changedCellStyle = ''
              if (cellChanged && changedCellStyles) {
                changedCellStyle =
                  changedCellStyles[fieldDesc.name]?.cells || changedCellStyles['*']?.cells || ''
              }

              const colxCell = isEditing
                ? editCellStyle
                : cellChanged
                  ? changedCellStyle
                  : (collsStyles && collsStyles[fieldDesc.name]?.cells) || ''

              // Resolve style object - for edit mode, extract from editCellStyles
              // For changed cells, extract from changedCellStyles
              let styleObj = resolveStyle('cell', fieldDesc.name)
              if (isEditing && editCellStyle) {
                const editPxs = extractPxFromColx(editCellStyle)
                if (Object.keys(editPxs).length > 0) {
                  styleObj = { ...styleObj, ...editPxs }
                }
              } else if (cellChanged && changedCellStyle) {
                const changedPxs = extractPxFromColx(changedCellStyle)
                if (Object.keys(changedPxs).length > 0) {
                  styleObj = { ...styleObj, ...changedPxs }
                }
              }

              if (fieldDesc.combo) {
                const { cols, render, name } = fieldDesc.combo
                const values = cols.map((c) => d[c])
                return (
                  <div
                    className={`w-full p-1 px-2 text-sm font-[Code] truncate${styles.elementCell ? ' ' + styles.elementCell : ''}${colxCell ? ' ' + colxCell : ''}`}
                    style={styleObj}
                    key={`${rowIdx}-combo-${name}`}
                  >
                    {render(values, d)}
                  </div>
                )
              } else {
                const field = fieldDesc.name
                const value = d[field]
                const canEdit = isEditable(field)

                // If cell is being edited
                if (isEditing) {
                  // Check for custom edit renderer (support wildcard '*')
                  const editRenderer =
                    (editRenderers && editRenderers[field]) || (editRenderers && editRenderers['*'])
                  if (editRenderer) {
                    return (
                      <div
                        className={`w-full p-1 px-2 text-sm font-[Code]${styles.elementCell ? ' ' + styles.elementCell : ''}${colxCell ? ' ' + colxCell : ''}`}
                        style={styleObj}
                        key={`${rowIdx}-${field}`}
                      >
                        {editRenderer(editValue, d, {
                          isEditing: true,
                          onChange: (newValue: any) => {
                            setEditingCells((prev) => {
                              const newMap = new Map(prev)
                              newMap.set(cellKey, newValue)
                              return newMap
                            })
                          },
                          onBlur: () => handleSaveEdit(rowIdx, field),
                          onKeyDown: (e: React.KeyboardEvent) =>
                            handleEditKeyDown(e, rowIdx, field),
                        })}
                      </div>
                    )
                  }

                  // Default edit input
                  const inputValue =
                    editValue !== null && editValue !== undefined ? String(editValue) : ''
                  return (
                    <div
                      className={`w-full p-1 px-2 text-sm font-[Code]${styles.elementCell ? ' ' + styles.elementCell : ''}${colxCell ? ' ' + colxCell : ''}`}
                      style={styleObj}
                      key={`${rowIdx}-${field}`}
                    >
                      <input
                        ref={(el) => {
                          if (el) {
                            inputRefs.current.set(cellKey, el)
                          } else {
                            inputRefs.current.delete(cellKey)
                          }
                        }}
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                          setEditingCells((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(cellKey, e.target.value)
                            return newMap
                          })
                        }}
                        onBlur={() => handleSaveEdit(rowIdx, field)}
                        onKeyDown={(e) => handleEditKeyDown(e, rowIdx, field)}
                        className="w-full bg-transparent border-none outline-none text-inherit"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )
                }

                // Normal (non-editing) cell
                return (
                  <div
                    className={`w-full p-1 px-2 text-sm font-[Code] truncate${styles.elementCell ? ' ' + styles.elementCell : ''}${colxCell ? ' ' + colxCell : ''}${canEdit ? ' cursor-text' : ''}`}
                    style={styleObj}
                    key={`${rowIdx}-${field}`}
                    title={
                      typeof value === 'string' || typeof value === 'number'
                        ? String(value)
                        : undefined
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCellClick(rowIdx, field, value)
                    }}
                  >
                    {renderers && renderers[field]
                      ? (renderers[field] as (val: any, row?: any) => JSX.Element)(value, d)
                      : typeof value === 'string' || typeof value === 'number'
                        ? String(value)
                        : JSON.stringify(value)}
                  </div>
                )
              }
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
