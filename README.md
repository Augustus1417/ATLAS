# ATLAS - AI-Powered PC Building Platform

An intelligent, modern full-stack application for building PCs with AI-powered recommendations, real-time compatibility checking, and comprehensive component management.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### One-Command Setup (Recommended)

**Windows:**
```bash
./setup.bat
```

**macOS/Linux:**
```bash
bash setup.sh
```

### Manual Setup

#### Backend Setup
```bash
cd atlas-backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp example.env .env

# Start backend
python -m uvicorn main:app --reload
```

The backend will run on `http://localhost:8000`

#### Frontend Setup
```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
ATLAS/
├── atlas-backend/           # FastAPI backend
│   ├── models/             # Database models
│   ├── routers/            # API endpoints
│   ├── services/           # Business logic
│   ├── utils/              # Utilities
│   ├── main.py             # App entry point
│   ├── config.py           # Configuration
│   ├── database.py         # Database setup
│   └── requirements.txt    # Python dependencies
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utilities & API client
│   │   ├── App.jsx         # Main app
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Tailwind CSS
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Vite configuration
│
├── setup.sh               # Setup script (macOS/Linux)
├── setup.bat              # Setup script (Windows)
└── README.md              # This file
```

## 🎯 Features

### User Authentication
- Secure JWT-based authentication
- User registration and login
- Protected routes
- Session persistence

### Component Management
- Browse thousands of PC components
- Filter by category and search
- View detailed specifications
- Price tracking and history
- Component comparison

### PC Builder
- Interactive component selection
- Real-time price calculation
- Drag-and-drop interface
- Save and manage builds
- Export build specifications

### AI Recommendations
- Budget-based recommendations
- Workload-specific suggestions:
  - Gaming
  - Content Creation
  - Streaming
  - Productivity
  - Workstation
- Real-time pricing
- Component reasoning

### Compatibility Checking
- Instant compatibility verification
- Multi-component checking
- Conflict detection
- Recommendations for resolution

### Build Management
- Save custom builds
- View build history
- Share builds publicly
- Detailed price breakdown
- Build statistics

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: psycopg2 (raw SQL)
- **Authentication**: JWT
- **AI/ML**: Integration-ready for recommendations

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **CSS**: Tailwind CSS 4
- **Routing**: React Router
- **HTTP Client**: Axios
- **State Management**: React Context API

## 📊 API Documentation

Full API documentation available at:
```
http://localhost:8000/docs
```

### Main Endpoints

**Authentication**
- `POST /users/register` - Register new user
- `POST /users/login` - User login
- `GET /users/me` - Get current user

**Components**
- `GET /components` - List components
- `GET /components/{id}` - Get component details
- `GET /components/{id}/specs` - Get specifications
- `GET /components/{id}/pricing` - Get pricing history

**Builder**
- `GET /builder/parts-by-category` - Get parts grouped by category
- `GET /builder/parts-flat` - Get all parts as flat list

**Builds**
- `POST /builds` - Create new build
- `GET /builds` - List user's builds
- `GET /builds/{id}` - Get build details
- `PUT /builds/{id}` - Update build
- `DELETE /builds/{id}` - Delete build

**Recommendations**
- `POST /recommendations` - Generate AI recommendations

**Compatibility**
- `POST /compatibility/check` - Check component compatibility

## 🔧 Configuration

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/atlas
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:8000
```

## 🚀 Deployment

### Frontend Production Build
```bash
cd client
npm run build
npm run preview
```

### Backend Deployment
See `atlas-backend/README.md` for deployment instructions

## 🧪 Testing

### Frontend Tests
```bash
cd client
npm run test
```

### Backend Tests
```bash
cd atlas-backend
pytest
```

## 📱 Mobile Support

The application is fully responsive and works on:
- iOS Safari (14+)
- Android Chrome
- Tablets and desktop browsers

## 🔐 Security Features

- JWT-based authentication
- CORS protection
- SQL injection prevention
- XSS protection via React
- HTTPS ready
- Secure password hashing (backend)

## 🎨 Design System

Premium, high-end UI design following:
- Awwwards standards
- Linear/Apple-style aesthetics
- Smooth animations and transitions
- Accessible color contrasts
- Responsive layouts

## 📈 Performance

- Frontend: ~300ms cold start with Vite
- Lazy loading components
- Optimized database queries
- Automatic code splitting
- Minimal bundle size (~300KB gzipped)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### CORS Errors
Make sure backend CORS settings include your frontend URL

### 401 Unauthorized
Session token expired - log in again

### Components Not Loading
Verify backend is running and accessible

### Build Errors
Clear `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review API docs at `http://localhost:8000/docs`
3. Open an issue on GitHub
4. Contact the development team

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced filtering and sorting
- [ ] Build sharing social features
- [ ] Price prediction
- [ ] Component reviews and ratings
- [ ] Integration with retailers
- [ ] Real-time inventory sync
- [ ] Advanced analytics dashboard

## 🙏 Acknowledgments

- FastAPI for the excellent backend framework
- React team for modern frontend capabilities
- Tailwind CSS for utility-first styling
- All contributors and testers

---

Built with ❤️ by the ATLAS Team
