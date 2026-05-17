# ATLAS Frontend

A premium, AI-powered PC building and recommendation platform built with React, Vite, and Tailwind CSS.

## Features

- **🤖 AI-Powered Recommendations**: Get personalized component recommendations based on budget and workload
- **🔨 Interactive PC Builder**: Drag-and-drop interface to build custom PCs with real-time pricing
- **⚡ Compatibility Checking**: Instant verification of component compatibility
- **💾 Component Library**: Browse thousands of PC components with detailed specs
- **📊 Price Tracking**: Monitor component prices and get alerts on deals
- **🌐 Build Sharing**: Save and share your builds with the community

## Tech Stack

- **React 19**: Modern React with hooks and latest features
- **Vite**: Lightning-fast build tool and dev server
- **Tailwind CSS 4**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **Premium Design**: High-end UI following Awwwards standards

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```env
VITE_API_BASE_URL=http://localhost:8000
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Features & Pages

### Authentication
- Login and register pages with validation
- JWT token management
- Protected routes
- Persistent login sessions

### Dashboard
- User welcome with statistics
- Featured components showcase
- Quick navigation to main features

### Component Library
- Browse all PC components
- Filter by category and search
- View detailed specs and pricing history
- Sort and organize components

### PC Builder
- Interactive component selection
- Real-time compatibility checking
- Price calculation
- Save builds with custom names

### AI Recommendations
- Budget-based recommendations
- Workload-specific suggestions
- Component reasoning
- Direct save to builds

### Builds Management
- View all saved builds
- Detailed build information
- Delete and manage builds
- Share builds publicly

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/               # Page components
├── utils/               # Utility functions
├── App.jsx              # Main app
├── main.jsx             # Entry point
└── index.css            # Tailwind CSS
```

## Running the Full Stack

### Backend
```bash
cd atlas-backend
source .venv/Scripts/activate
python -m uvicorn main:app --reload
```

### Frontend
```bash
cd client
npm run dev
```

Visit `http://localhost:5173`

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

## Performance

- Fast HMR with Vite
- Automatic code splitting
- Tree-shaken CSS
- Optimized bundle size

