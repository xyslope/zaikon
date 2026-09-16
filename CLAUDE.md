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

### Claude Code Parallel Execution
For efficient distributed task processing using tmux:

**Quick Start:**
```bash
# One-command setup (recommended)
./claude-parallel-setup.sh

# Or with custom session name
./claude-parallel-setup.sh my-session-name
```

**Manual Setup:**
```bash
# Set alias for Claude Code with permissions bypass
alias cc="claude --dangerously-skip-permissions"

# Create 4-pane tmux layout (left: main, right: 3 workers)
tmux split-window -h && tmux split-window -v -t 1 && tmux split-window -v -t 2

# Check pane IDs (will vary by session)
tmux list-panes -F "#{pane_index}: #{pane_id} #{pane_current_command} #{pane_active}"

# Launch Claude Code instances in all panes (replace %X with actual pane IDs)
tmux send-keys -t %10 "cc" && sleep 0.1 && tmux send-keys -t %10 Enter & \
tmux send-keys -t %11 "cc" && sleep 0.1 && tmux send-keys -t %11 Enter & \
tmux send-keys -t %12 "cc" && sleep 0.1 && tmux send-keys -t %12 Enter & \
tmux send-keys -t %13 "cc" && sleep 0.1 && tmux send-keys -t %13 Enter & \
wait
```

**Task Assignment Methods:**

*Basic Template:*
```bash
tmux send-keys -t %11 "cd '/working/directory' && あなたはFrontend専門Worker1です。タスク内容。エラー時は[Worker1]でtmux send-keys -t %10でメイン報告。" && sleep 0.1 && tmux send-keys -t %11 Enter
```

*Role-Based Parallel Assignment:*
```bash
tmux send-keys -t %11 "あなたはFrontend専門です。UIタスク内容。" && sleep 0.1 && tmux send-keys -t %11 Enter & \
tmux send-keys -t %12 "あなたはBackend専門です。APIタスク内容。" && sleep 0.1 && tmux send-keys -t %12 Enter & \
tmux send-keys -t %13 "あなたはTest/QA専門です。品質保証タスク内容。" && sleep 0.1 && tmux send-keys -t %13 Enter & \
wait
```

**Communication System:**

*Worker to Main Reporting:*
```bash
# Workers use this command to report back to main pane (%10)
tmux send-keys -t %10 '[Frontend] UIコンポーネント完了しました' && sleep 0.1 && tmux send-keys -t %10 Enter
tmux send-keys -t %10 '[Backend] APIエンドポイント作成完了' && sleep 0.1 && tmux send-keys -t %10 Enter
tmux send-keys -t %10 '[Test/QA] テストケース実行結果：3件成功、1件エラー' && sleep 0.1 && tmux send-keys -t %10 Enter
```

**Token Management:**

*Individual /clear:*
```bash
tmux send-keys -t %11 "/clear" && sleep 0.1 && tmux send-keys -t %11 Enter
```

*Parallel /clear (all workers):*
```bash
tmux send-keys -t %11 "/clear" && sleep 0.1 && tmux send-keys -t %11 Enter & \
tmux send-keys -t %12 "/clear" && sleep 0.1 && tmux send-keys -t %12 Enter & \
tmux send-keys -t %13 "/clear" && sleep 0.1 && tmux send-keys -t %13 Enter & \
wait
```

*Clear Timing:*
- After task completion (prepare for new tasks)
- When token usage becomes high (check with `ccusage`)
- When errors are frequent (reset context)
- When switching from complex to simple tasks

**Status Monitoring:**

*Individual Pane Check:*
```bash
tmux capture-pane -t %11 -p | tail -10
```

*All Workers Batch Check:*
```bash
for pane in %11 %12 %13; do
    echo "=== $pane ==="
    tmux capture-pane -t $pane -p | tail -5
done
```

*Role-Based Status Check:*
```bash
echo "=== Frontend Worker ==="; tmux capture-pane -t %11 -p | tail -3
echo "=== Backend Worker ==="; tmux capture-pane -t %12 -p | tail -3  
echo "=== Test/QA Worker ==="; tmux capture-pane -t %13 -p | tail -3
```

**Best Practices:**

*1. Clear Role Assignment:*
- Always specify pane number in task assignments
- Provide specific, concrete task descriptions
- Include error reporting instructions in every task
- Example: "あなたはpane1です。タスク内容。エラー時は[pane1]でtmux send-keys -t %4でメイン報告。"

*2. Efficient Communication:*
- Enforce one-liner reporting format
- Require [pane番号] prefix in all reports
- Demand specific error details, not generic messages
- Example: `tmux send-keys -t %4 '[pane2] TypeError: Cannot read property at line 45' && sleep 0.1 && tmux send-keys -t %4 Enter`

*3. Token Usage Management:*
- Execute regular /clear commands to prevent token overflow
- Monitor high token consumption patterns
- Use `ccusage` for usage verification
- Clear timing: after task completion, before complex tasks, when errors frequent

*4. Error Resolution Protocol:*
- Instruct workers to use web search for solution research
- Share specific error messages and contexts
- Apply successful solutions across similar panes
- Document recurring solutions for future reference

**Important Limitations:**
- Workers cannot execute /clear directly (main must use tmux send-keys)
- All reports must be in one-liner format via tmux send-keys
- Always verify pane IDs before task assignment
- Monitor token usage regularly with ccusage
- Break complex instructions into sequential steps

**Example Usage Scenarios:**

*Scenario 1: Feature Development (User Dashboard)*
```bash
# Role-based feature development with specialization
tmux send-keys -t %11 "あなたはFrontend専門です。ユーザーダッシュボードのUI実装を担当。エラー時は[Frontend]で報告。" Enter &
tmux send-keys -t %12 "あなたはBackend専門です。ダッシュボード用API実装を担当。エラー時は[Backend]で報告。" Enter &
tmux send-keys -t %13 "あなたはTest/QA専門です。ダッシュボード機能のテスト作成を担当。エラー時は[Test/QA]で報告。" Enter &
wait
```

*Scenario 2: Bug Investigation*
```bash
# Specialized debugging across different layers
tmux send-keys -t %11 "あなたはFrontend専門です。UI表示エラーの調査。エラー時は[Frontend]で報告。" Enter &
tmux send-keys -t %12 "あなたはBackend専門です。データベース接続問題の調査。エラー時は[Backend]で報告。" Enter &
tmux send-keys -t %13 "あなたはTest/QA専門です。テスト失敗の原因調査。エラー時は[Test/QA]で報告。" Enter &
wait
```

*Scenario 3: Code Review & Refactoring*
```bash
# Domain-specific code review
tmux send-keys -t %11 "あなたはFrontend専門です。views/とpublic/のコードレビュー。エラー時は[Frontend]で報告。" Enter &
tmux send-keys -t %12 "あなたはBackend専門です。controllers/とrepositories/のリファクタリング。エラー時は[Backend]で報告。" Enter &
tmux send-keys -t %13 "あなたはTest/QA専門です。既存テストの改善と新規テスト追加。エラー時は[Test/QA]で報告。" Enter &
wait
```

*Common Management Commands:*
```bash
# Check all worker status by role
echo "=== Frontend ==="; tmux capture-pane -t %11 -p | tail -3
echo "=== Backend ==="; tmux capture-pane -t %12 -p | tail -3
echo "=== Test/QA ==="; tmux capture-pane -t %13 -p | tail -3

# Clear all workers after task completion
tmux send-keys -t %11 "/clear" Enter & tmux send-keys -t %12 "/clear" Enter & tmux send-keys -t %13 "/clear" Enter & wait

# Monitor token usage
ccusage
```

**Usage Notes:**
- Pane 0 (%10): Main Coordinator - Project management, task integration, decision making
- Pane 1 (%11): Frontend/UI Specialist - Views, CSS, JavaScript, UX design
- Pane 2 (%12): Backend/API Specialist - Controllers, Repositories, Database, Business logic  
- Pane 3 (%13): Test/QA Specialist - Testing, debugging, documentation, quality assurance
- Always include role-specific reporting instructions in task assignments
- Use `tmux select-pane -t N` to switch between panes
- Monitor worker status when no response received
- Leverage each worker's specialization for optimal task distribution

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