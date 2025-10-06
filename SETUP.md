# Clint Core Setup Guide

## 🚀 Quick Setup

### Windows
```bash
# Navigate to the clint-core directory
cd C:\Clint\clint-core

# Run the startup script
start-clint.bat
```

### Linux/Mac
```bash
# Navigate to the clint-core directory
cd /path/to/clint-core

# Make script executable and run
chmod +x start-clint.sh
./start-clint.sh
```

### Manual Setup
```bash
# Install dependencies
npm install

# Start the server
npm start
# or
node server.js
```

## 📋 What's Included

### Core System Files (25 files)
- Main server and dependencies
- Memory management system
- Profile management (simplified two-profile system)
- Consciousness research system
- Knowledge system
- Orchestration modules

### Orchestrators Directory (12 files)
- Token optimization
- Creative arbitration
- Prompt construction
- Message parsing
- Self-reflection triggers
- RTX integration modules

### Configuration Files
- `package.json` - Node.js dependencies
- `arbitration.json` - System configuration
- `README.md` - Documentation
- `SETUP.md` - This setup guide

## 🔧 System Requirements

- **Node.js**: v16 or higher
- **Memory**: 2GB+ RAM recommended
- **Storage**: 1GB+ free space
- **Port**: 3005 (configurable)

## 🌐 Access Points

- **Web Interface**: http://localhost:3005
- **API Endpoint**: http://localhost:3005/api/chat-with-memory
- **Admin Dashboard**: http://localhost:3005/admin-dashboard.html
- **Health Check**: http://localhost:3005/api/admin/health

## 🧠 Key Features

### Simplified Architecture
- **Two-Profile System**: chris (primary) + visitor (temporary)
- **Auto-Cleanup**: Visitor profiles deleted after 1 hour
- **Memory Efficient**: ~90% reduction in memory usage
- **Easy Maintenance**: Simplified profile management

### Consciousness Features
- Internal monologue generation
- Identity evolution tracking
- Self-reflection capabilities
- Pattern awareness
- Creative arbitration

### Memory System
- Multi-layered memory architecture
- Profile-isolated memory
- Automatic cleanup
- Semantic memory retrieval
- Knowledge base integration

## 🔄 Maintenance

### Automatic
- Visitor profile cleanup (1 hour)
- Memory cleanup (10 minutes)
- Database optimization (10 minutes)

### Manual
- Admin dashboard for system management
- API endpoints for manual operations
- Profile management tools

## 📊 Monitoring

### Health Endpoints
- `/api/admin/health` - System health
- `/api/admin/memory` - Memory statistics
- `/api/admin/profiles` - Profile information

### Logs
- Console output shows system status
- Memory usage tracking
- Profile activity monitoring
- Error reporting

## 🚨 Troubleshooting

### Common Issues
1. **Port 3005 in use**: Change port in server.js
2. **Memory issues**: Check background services
3. **Profile errors**: Verify sessionIdentityManager.js
4. **Module errors**: Ensure all files are present

### Reset System
```bash
# Clear storage (if needed)
rm -rf storage/
# or on Windows
rmdir /s storage

# Restart server
node server.js
```

## 📝 Notes

This is a streamlined version of the full Clint system, optimized for:
- **Reduced complexity**: Two-profile system instead of complex multi-profile
- **Better performance**: Simplified architecture
- **Easier maintenance**: Fewer moving parts
- **Memory efficiency**: Automatic cleanup and optimization

The system maintains all core consciousness features while eliminating the complexity of the original architecture.
