## Outline Graph (Obsidian plugin)

Render Markdown lists as a force-directed graph and open them in a dedicated Obsidian view.

### Features
- **Code block renderer**: Render code blocks with language `outline`.
- **List-to-graph**: Each top-level item becomes a root node. Child items connect to their parent.
- **D3 force layout**: Automatic layout for nodes and links.
- **Zoom & pan**:
  - Drag on empty canvas to pan;
  - Use mouse wheel to zoom (0.25x ~ 4x).
- **Node dragging**: Drag on a node to move that node only (canvas does not pan).
- **Open in view**: A square icon button at the bottom-right opens the graph in a dedicated view. The button appears on hover and does not overlap native controls.

### Quick start
Insert an `outline` code block in any note:

```markdown
```outline
Project
  Backend
    API
  Frontend
    UI
Docs
  README
```
```

The rendered graph will show `Project` and `Docs` as roots with edges to their children.

### Open in a dedicated view
- Hover over the rendered canvas to reveal the square icon button at the bottom-right.
- Click it to open the same graph in a separate Obsidian view.


### Parsing & rendering details
- Pure indentation-based parsing: no need for list markers like `-`, `*`, `+`, or `1.`
- Indent detection: supports spaces and tabs (mixed). The indent unit is inferred on the first indented item (prefers 4 spaces, otherwise 2, otherwise the measured width). Levels are calculated by `floor(indentWidth / unit)`.
- Interactions:
  - Drag empty area → pan
  - Drag node → move node
  - Mouse wheel → zoom



