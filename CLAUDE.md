# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
- `npm run dev` - Start development server with nodemon (auto-restart)
- `npm start` - Start production server
- `npm run migrate` - Run database migrations

### Testing
- `npm test` - Run Jest tests
- `npm run testcover` - Run tests with coverage report

## Project Architecture

### Core Application Structure
This is a Node.js/Express web application with LINE Bot integration for inventory management. The application follows a repository pattern with controllers handling HTTP requests.

**Main Components:**
- `app.js` - Main application entry point with Express server setup
- `db.js` - SQLite database connection using better-sqlite3
- `migrate_runner.js` - Database migration runner executed on startup

### Data Layer
- **Database**: SQLite with better-sqlite3 driver
- **Migrations**: Sequential numbered migrations in `/migrations/` directory
- **Repositories**: Data access layer in `/repositories/` directory
  - UserRepository, LocationRepository, ItemRepository, MemberRepository, BanEmailRepository

### Controllers
MVC pattern with controllers in `/controllers/` directory:
- `userController.js` - User registration, editing, and management
- `locationController.js` - Location management with inventory status calculation
- `itemController.js` - Item management within locations
- `lineController.js` - LINE Bot webhook handling
- `lineSetupController.js` - LINE Bot configuration

### Authentication & Security
- Session-based authentication using express-session with file store
- Admin routes protected by `ADMIN_KEY` environment variable in URL path
- Email-based user registration with ban list functionality

### LINE Bot Integration
- Uses @line/bot-sdk for LINE messaging platform integration
- Webhook endpoints for receiving LINE messages
- Bot responses for inventory status updates

### Frontend
- EJS templating engine
- Views in `/views/` directory
- Static assets in `/public/` directory
- Font Awesome icons for UI elements

### Environment Configuration
- Development: SQLite database in `./data/zaikon.db`
- Production: Database at `/data/zaikon.db`
- Environment variables managed via .env file
- Key variables: `ADMIN_KEY`, `NODE_ENV`

### Deployment
- Configured for Fly.io deployment
- Dockerfile configuration available
- Environment variables set via `fly secrets set`