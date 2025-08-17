# Image Text Composer


[Live App (Hosted on Vercel)]([url](https://image-text-editor-mocha.vercel.app))


A powerful, desktop-only single-page image editing tool that enables users to upload PNG images and overlay them with fully customizable text. Built with Next.js, TypeScript, and react-konva for professional-grade text editing capabilities.

## 🔥 Quick Feature Highlights

### Core
- Upload PNG backgrounds with auto-sized canvas
- Add multiple text layers and edit them independently
- Advanced text: Google Fonts, size, weight, color, alignment, multi-line
- Interactive canvas: drag, resize, rotate with snap guides and keyboard nudge
- Layer management, undo/redo, PNG export, autosave, keyboard shortcuts

### Bonus + Advanced
- Magic Place: smart auto-placement to high-contrast, low-clutter areas using saliency heatmap and contrast scoring, avoiding overlaps; animated move with a brief guide overlay
- Shareable Links (no backend): state serialized, LZ-compressed in URL hash; hydration runs after autosave to avoid races; one-click copy from toolbar (Paste it onto Safari for now because google chrome cuts off a pasted link that is very long. Copy from Chrome & paste the link into safari)
- Auto Color picker - Showcases the colors that are already present in the image to the user so that they can choose those colors easily.
- Curved Text (Arc Warp): radius, up/down direction, extra spacing; included in presets and persisted in share/autosave
- Text Shadow: color, blur, offset X/Y
- Google Fonts Enhancements: API proxy with no-store and curated top latin fonts; dynamic font preloading for layers/presets and preview preloading in dropdown
- Text Opacity control rendered on canvas and in Inspector
- Multi-line editing UX: textarea overlay; Enter inserts newline; Cmd/Ctrl+Enter commits
- Inspector polish: darker input text for readability, card-based layout
- Performance: throttled color picker drags and deferred commits for smoother interaction
- Layer reordering semantics and commits align with front/back expectations and undo/redo

## 🚀 Live Demo

[View Live Demo](https://www.loom.com/share/89fee883f06442bea0b57065b95d007f?sid=73a328db-99e5-4f75-8598-00b110546a2f))

## ✨ Features

### Core Features
- **PNG Image Upload** - Upload background images with automatic canvas sizing
- **Multi-layer Text Editing** - Add unlimited text layers with independent styling
- **Advanced Text Properties**:
  - Google Fonts integration (200+ fonts)
  - Font size, weight, and color customization
  - Opacity and alignment controls
  - Multi-line text support
- **Interactive Canvas**:
  - Drag, resize, and rotate text layers
  - Snap-to-center guides
  - Keyboard nudging (arrow keys)
- **Layer Management** - Reorder layers with drag-and-drop
- **Undo/Redo System** - 50-step history with visual indicators
- **Export** - Download as PNG with original image dimensions
- **Autosave** - Automatic persistence to localStorage
- **Keyboard Shortcuts** - Professional workflow shortcuts

### Keyboard Shortcuts
- `⌘/Ctrl + Z` - Undo
- `⌘/Ctrl + Shift + Z` - Redo
- `T` - Add new text layer
- `⌘/Ctrl + D` - Duplicate selected layer
- `Delete/Backspace` - Delete selected layer
- `Arrow Keys` - Nudge selected layer (hold Shift for 10px steps)
- `Enter` - Insert newline while editing text
- `⌘/Ctrl + Enter` - Commit text edit (multiline)
- `Escape` - Deselect all layers

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Canvas**: react-konva + Konva.js for HTML5 Canvas interactions
- **State Management**: Zustand with Immer for immutable updates
- **Styling**: Tailwind CSS
- **Fonts**: Google Fonts API integration
- **Validation**: Zod for state schema validation

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd image-text-composer
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp .env.example .env.local
   ```
   Add your Google Fonts API key for enhanced font loading:
   ```
   GOOGLE_FONTS_API_KEY=your_api_key_here
   ```
   *Note: The app works without an API key using fallback fonts*

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Usage

1. **Upload a PNG image** using the "Upload PNG" button
2. **Add text layers** by clicking "Add Text" or pressing `T`
3. **Edit text** by double-clicking any text layer
4. **Style text** using the Inspector panel on the right
5. **Use Magic Place** to auto-place selected text into highly readable areas (Toolbar → Magic Place)
6. **Manage layers** using the Layers panel on the left
7. **Export your design** as PNG using the "Export PNG" button

## 🏗 Architecture

### Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── api/fonts/         # Google Fonts API proxy
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── EditorCanvas.tsx   # Main canvas component
│   ├── TextNode.tsx       # Individual text layer
│   ├── Toolbar.tsx        # Top toolbar
│   ├── LayersPanel.tsx    # Left sidebar
│   ├── InspectorPanel.tsx # Right sidebar
│   └── ...
├── editor/               # State management
│   ├── store.ts         # Zustand store
│   └── types.ts         # TypeScript definitions
└── hooks/               # Custom React hooks
    └── useKeyboardShortcuts.ts
```

### Design Decisions

**Why Konva over Fabric.js?**
- First-class React integration with `react-konva`
- Clear stage/layer/node architecture
- Built-in transformer handles for resize/rotate
- Excellent TypeScript support
- Better performance for text rendering

**Why Zustand over Redux?**
- Minimal boilerplate
- No provider nesting required
- Built-in persistence middleware
- Excellent TypeScript inference
- Smaller bundle size

**State Management Strategy**
- Store only serializable data (no Konva node instances)
- Treat Konva nodes as "dumb" views
- Use Immer for immutable updates
- Commit snapshots only on user action completion

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   ```
   GOOGLE_FONTS_API_KEY=your_api_key_here
   ```
3. **Deploy** - Vercel will automatically build and deploy

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform supporting Node.js:

```bash
npm run build
npm start
```

## 🧪 Testing

Run the development server and test core functionality:

1. Upload a PNG image
2. Add and edit text layers
3. Test all transform operations (move, resize, rotate)
4. Verify undo/redo functionality
5. Test export with original dimensions
6. Verify autosave by refreshing the page

## 🔧 Configuration

### Google Fonts API
To enable full Google Fonts integration:

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Web Fonts Developer API
3. Add the key to your environment variables

Without an API key, the app uses a curated list of popular fonts.

### Canvas Limits
- Maximum image dimensions: 8000px × 8000px
- Maximum file size: 20MB
- Supported format: PNG only

## 🐛 Known Limitations

- **Desktop only** - Not optimized for mobile devices
- **PNG only** - Other image formats not supported
- **Memory usage** - Very large images may impact performance
- **Font loading** - Some Google Fonts may take time to load initially

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check existing GitHub issues
- Create a new issue with detailed reproduction steps
- Include browser version and console errors
