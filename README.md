## Outline Graph (Obsidian plugin)
<img width="1654" height="1226" alt="image" src="https://github.com/user-attachments/assets/338e9041-f46d-4828-95b6-46c196dc88f5" />

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

<pre>
```outline
Project
  Backend
    API
  Frontend
    UI
Docs
  README
```
</pre>

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

### Custom Styling

You can customize the appearance of nodes and root nodes through CSS. In Obsidian, you can add the following styles in Settings → Appearance → CSS snippets:

#### Customize Root Node Styles

Root nodes have the `root-node` class applied to both circle and text elements. You can customize them using the following CSS selectors:

```css
/* Customize root node circle styles */
.outline-graph-svg .root-node.node-circle {
    /* Modify root node circle styles */
    stroke: #ff6b6b; /* Custom border color */
    stroke-width: 3px; /* Custom border width */
    r: 8px; /* Custom radius */
}

/* Customize root node text styles */
.outline-graph-svg .root-node.node-text {
    fill: #2d3436; /* Custom text color */
    font-size: 14px; /* Custom font size */
}
```

#### Customize All Node Styles

```css
/* Customize all node circles */
.outline-graph-svg .node-circle {
    /* Modify all node circle styles */
    fill: #74b9ff; /* Custom fill color */
    r: 5px; /* Custom radius */
}

/* Customize all node text */
.outline-graph-svg .node-text {
    /* Modify all node text styles */
    font-size: 11px;
    fill: #2d3436;
}
```

#### Customize Link Styles

```css
/* Customize connection lines */
.outline-graph-svg .link-line {
    stroke: #636e72; /* Custom line color */
    stroke-width: 2px; /* Custom line width */
    stroke-opacity: 0.8; /* Custom opacity */
}
```

#### Adding Hover Effects

```css
/* Node hover effects */
.outline-graph-svg .nodes g:hover circle {
    fill: var(--text-accent-hover);
    transform: scale(1.1);
    transition: all 0.2s ease;
}

.outline-graph-svg .nodes g:hover text {
    fill: var(--text-accent-hover);
    font-weight: bold;
}
```

---

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="150">](https://www.buymeacoffee.com/eatgrass)
