# Agent Guidelines for Zaikon

## Build/Test Commands
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run all Jest tests
- `npm run testcover` - Run tests with coverage
- `jest tests/specific.test.js` - Run single test file
- `npm run migrate` - Run database migrations

## Code Style
- **Language**: Node.js/JavaScript (CommonJS modules)
- **Imports**: Use `require()` for dependencies, relative paths for local modules
- **Classes**: Use ES6 classes with static methods for repositories/controllers
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Database**: SQLite with better-sqlite3, prepared statements for queries
- **Error Handling**: Try-catch blocks, console.error for logging, return appropriate HTTP status codes
- **Comments**: Japanese comments allowed, minimal inline documentation
- **File Structure**: Controllers in `/controllers`, Repositories in `/repositories`, Tests in `/tests`
- **Views**: EJS templates in `/views` directory
- **Sessions**: File-based sessions stored in `/data/sessions`

## Testing
- Jest framework with supertest for HTTP testing
- Test files follow `*.test.js` naming convention
- Use `request.agent()` for session-based testing

## 説明方法
日本語でお願いします。
