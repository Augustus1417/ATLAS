# 🚀 QUICK START GUIDE - ATLAS Frontend

## TL;DR - Get Running in 5 Minutes

### Prerequisites
- Python 3.8+ installed
- Node.js 18+ installed
- PostgreSQL running (or using mock data)

### Start Backend (Terminal 1)
```bash
cd atlas-backend
source .venv/bin/activate    # Windows: .venv\Scripts\activate
python -m uvicorn main:app --reload
```
✅ Backend runs on http://localhost:8000

### Start Frontend (Terminal 2)
```bash
cd client
npm run dev
```
✅ Frontend runs on http://localhost:5173

### Open Browser
Visit **http://localhost:5173**

---

## 📋 What You Can Do Now

1. **Register Account**
   - Go to http://localhost:5173
   - Click "Create Account"
   - Fill in username, email, password
   - Click "Create Account"

2. **Login**
   - Click "Sign In"
   - Use your credentials
   - Click "Sign In"

3. **Explore Components**
   - Click "Explore Components" on dashboard
   - Filter by category or search
   - Click a component to see details

4. **Build Your PC**
   - Click "Build Your PC"
   - Select components from 8 categories
   - See real-time price calculation
   - Click "Save Build"

5. **Get AI Recommendations**
   - Click "Get Recommendations"
   - Set budget (e.g., 150000 PHP)
   - Select workload (gaming, streaming, etc.)
   - Get AI-powered suggestions
   - Save the build

6. **Check Compatibility**
   - While building, system checks automatically
   - Alerts you of any conflicts
   - Suggests better combinations

7. **Manage Builds**
   - Click "My Builds" to see all your builds
   - Click on a build to see details
   - Delete or modify builds

---

## 🎯 Features Overview

| Feature | Location | Status |
|---------|----------|--------|
| Authentication | Login/Register | ✅ Complete |
| Component Browser | /components | ✅ Complete |
| PC Builder | /builder | ✅ Complete |
| AI Recommendations | /recommendations | ✅ Complete |
| Build Management | /builds | ✅ Complete |
| Compatibility Check | In Builder | ✅ Complete |
| Price Tracking | All pages | ✅ Complete |
| Responsive Design | All pages | ✅ Complete |
| Dark Theme | All pages | ✅ Complete |
| Performance | All pages | ✅ Optimized |

---

## 📁 File Locations

```
Frontend: c:/Users/Admin/ATLAS/client/
Backend: c:/Users/Admin/ATLAS/atlas-backend/
API Docs: http://localhost:8000/docs (when backend running)
```

---

## 🛠️ Common Commands

### Frontend
```bash
cd client
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Check code quality
```

### Backend
```bash
cd atlas-backend
source .venv/bin/activate
python -m uvicorn main:app --reload    # Start server
```

---

## ⚡ Performance Tips

- Frontend loads in ~300ms (Vite)
- Build outputs to single JS+CSS
- Lazy loading for components
- Automatic code splitting
- Optimized for mobile

---

## 🐛 Troubleshooting

### Port 5173 Already in Use?
```bash
npm run dev -- --port 5174
```

### Port 8000 Already in Use?
```bash
python -m uvicorn main:app --reload --port 8001
```

### CORS Errors?
Make sure backend is running on http://localhost:8000

### Can't Login?
- Check backend is running
- Verify API URL in .env.local
- Clear browser cache

### Build Fails?
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📊 What's Included

✅ 9 complete pages
✅ 10+ reusable components
✅ Full API integration
✅ Authentication system
✅ Error handling
✅ Form validation
✅ Responsive design
✅ Dark theme
✅ Loading states
✅ Production build

---

## 💡 Pro Tips

1. **Dark Mode**: Enabled by default - perfect for late-night coding
2. **Mobile Friendly**: Fully responsive - test on your phone
3. **API Docs**: Check http://localhost:8000/docs for all endpoints
4. **Component Library**: Browse components to understand the codebase
5. **Keyboard Shortcuts**: Tab to navigate, Enter to submit forms

---

## 🔐 Sample Test Data

Use these to test:
```
Email: test@example.com
Password: password123

OR register a new account
```

---

## 📱 Browser Support

✅ Chrome/Chromium 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile browsers (iOS/Android)

---

## 🎉 You're Ready!

Everything is set up and ready to go. No additional configuration needed!

### Next: Open Terminal and Run!

```bash
# Terminal 1 - Backend
cd atlas-backend
source .venv/bin/activate
python -m uvicorn main:app --reload

# Terminal 2 - Frontend
cd client
npm run dev

# Then visit: http://localhost:5173
```

**Enjoy! 🚀**
