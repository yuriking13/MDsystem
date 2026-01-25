import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../pg.js';
import crypto from 'crypto';
import { verifyPassword } from '../lib/password.js';

// Admin token handling
function generateAdminToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashAdminToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Middleware to verify admin access
async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const userId = (req.user as any).sub;
  const result = await pool.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [userId]
  );

  if (!result.rowCount || !result.rows[0].is_admin) {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

// Log admin actions
async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: any,
  ipAddress: string | null
) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, targetType, targetId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

// Log system error
async function logSystemError(
  errorType: string,
  errorMessage: string,
  errorStack: string | null,
  userId: string | null,
  requestPath: string | null,
  requestMethod: string | null,
  requestBody: any,
  ipAddress: string | null
) {
  try {
    await pool.query(
      `INSERT INTO system_error_logs 
       (error_type, error_message, error_stack, user_id, request_path, request_method, request_body, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [errorType, errorMessage, errorStack, userId, requestPath, requestMethod, JSON.stringify(requestBody), ipAddress]
    );
  } catch (err) {
    console.error('Failed to log system error:', err);
  }
}

export async function adminRoutes(app: FastifyInstance) {
  // Admin login with separate token (can use password or special admin token)
  app.post('/api/admin/login', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      adminToken: z.string().optional() // Optional additional admin token for extra security
    }).parse(req.body);

    const found = await pool.query(
      `SELECT id, email, password_hash, is_admin, admin_token_hash FROM users WHERE email = $1`,
      [body.email]
    );

    if (!found.rowCount) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = found.rows[0];
    
    // Verify password
    const passwordOk = await verifyPassword(user.password_hash, body.password);
    if (!passwordOk) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Must be admin
    if (!user.is_admin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    // If admin has token set, require it
    if (user.admin_token_hash && !body.adminToken) {
      return reply.code(401).send({ error: 'Admin token required', requiresToken: true });
    }

    if (user.admin_token_hash && body.adminToken) {
      const tokenHash = hashAdminToken(body.adminToken);
      if (tokenHash !== user.admin_token_hash) {
        return reply.code(401).send({ error: 'Invalid admin token' });
      }
    }

    // Update last login
    await pool.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);

    // Log admin login
    const ipAddress = req.ip;
    await logAdminAction(user.id, 'admin_login', null, null, {}, ipAddress);

    const token = app.jwt.sign({ sub: user.id, email: user.email, isAdmin: true } as any);
    
    return { 
      user: { id: user.id, email: user.email, isAdmin: true }, 
      token 
    };
  });

  // Verify admin status
  app.get('/api/admin/me', { preHandler: [requireAdmin] }, async (req: any) => {
    return { 
      user: { 
        id: req.user.sub, 
        email: req.user.email, 
        isAdmin: true 
      } 
    };
  });

  // Generate/reset admin token for extra security
  app.post('/api/admin/generate-token', { preHandler: [requireAdmin] }, async (req: any) => {
    const token = generateAdminToken();
    const tokenHash = hashAdminToken(token);

    await pool.query(
      `UPDATE users SET admin_token_hash = $1 WHERE id = $2`,
      [tokenHash, req.user.sub]
    );

    await logAdminAction(req.user.sub, 'generate_admin_token', 'user', req.user.sub, {}, req.ip);

    return { 
      token, 
      message: 'Save this token securely. It will not be shown again.' 
    };
  });

  // ===== Dashboard Stats =====
  app.get('/api/admin/stats', { preHandler: [requireAdmin] }, async () => {
    const [usersCount, projectsCount, articlesCount, documentsCount, activeToday, errorsToday] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM projects'),
      pool.query('SELECT COUNT(*) FROM articles'),
      pool.query('SELECT COUNT(*) FROM documents'),
      pool.query(`SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE DATE(started_at) = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) FROM system_error_logs WHERE DATE(created_at) = CURRENT_DATE AND NOT resolved`)
    ]);

    return {
      totalUsers: parseInt(usersCount.rows[0].count),
      totalProjects: parseInt(projectsCount.rows[0].count),
      totalArticles: parseInt(articlesCount.rows[0].count),
      totalDocuments: parseInt(documentsCount.rows[0].count),
      activeUsersToday: parseInt(activeToday.rows[0].count),
      unresolvedErrorsToday: parseInt(errorsToday.rows[0].count)
    };
  });

  // ===== Users Management =====
  app.get('/api/admin/users', { preHandler: [requireAdmin] }, async (req: any) => {
    const query = z.object({
      page: z.string().optional().transform(v => parseInt(v || '1')),
      limit: z.string().optional().transform(v => parseInt(v || '20')),
      search: z.string().optional()
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;
    let whereClause = '';
    const params: any[] = [];

    if (query.search) {
      whereClause = 'WHERE email ILIKE $1';
      params.push(`%${query.search}%`);
    }

    const [users, total] = await Promise.all([
      pool.query(`
        SELECT 
          u.id, u.email, u.created_at, u.last_login_at, u.is_admin,
          COUNT(DISTINCT p.id) as projects_count,
          COUNT(DISTINCT pm.project_id) as member_of_count,
          COALESCE(sub.status, 'free') as subscription_status
        FROM users u
        LEFT JOIN projects p ON p.created_by = u.id
        LEFT JOIN project_members pm ON pm.user_id = u.id
        LEFT JOIN user_subscriptions sub ON sub.user_id = u.id
        ${whereClause}
        GROUP BY u.id, sub.status
        ORDER BY u.created_at DESC
        LIMIT ${query.limit} OFFSET ${offset}
      `, params),
      pool.query(`SELECT COUNT(*) FROM users ${whereClause}`, params)
    ]);

    return {
      users: users.rows,
      total: parseInt(total.rows[0].count),
      page: query.page,
      totalPages: Math.ceil(parseInt(total.rows[0].count) / query.limit)
    };
  });

  // Get single user details
  app.get('/api/admin/users/:userId', { preHandler: [requireAdmin] }, async (req: any) => {
    const { userId } = req.params;

    const [user, projects, activity, sessions] = await Promise.all([
      pool.query(`
        SELECT u.*, sub.status as subscription_status, sub.expires_at as subscription_expires
        FROM users u
        LEFT JOIN user_subscriptions sub ON sub.user_id = u.id
        WHERE u.id = $1
      `, [userId]),
      pool.query(`
        SELECT p.id, p.name, p.created_at, 
               COUNT(DISTINCT d.id) as documents_count,
               COUNT(DISTINCT pa.article_id) as articles_count
        FROM projects p
        LEFT JOIN documents d ON d.project_id = p.id
        LEFT JOIN project_articles pa ON pa.project_id = p.id
        WHERE p.created_by = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 10
      `, [userId]),
      pool.query(`
        SELECT action_type, COUNT(*) as count, 
               DATE(created_at) as date,
               SUM(duration_seconds) as total_duration
        FROM user_activity
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY action_type, DATE(created_at)
        ORDER BY date DESC
      `, [userId]),
      pool.query(`
        SELECT * FROM user_sessions
        WHERE user_id = $1
        ORDER BY started_at DESC
        LIMIT 10
      `, [userId])
    ]);

    if (!user.rowCount) {
      return { error: 'User not found' };
    }

    return {
      user: user.rows[0],
      projects: projects.rows,
      recentActivity: activity.rows,
      sessions: sessions.rows
    };
  });

  // Update user admin status
  app.patch('/api/admin/users/:userId/admin', { preHandler: [requireAdmin] }, async (req: any) => {
    const { userId } = req.params;
    const body = z.object({ isAdmin: z.boolean() }).parse(req.body);

    await pool.query(
      `UPDATE users SET is_admin = $1 WHERE id = $2`,
      [body.isAdmin, userId]
    );

    await logAdminAction(req.user.sub, 'update_admin_status', 'user', userId, { isAdmin: body.isAdmin }, req.ip);

    return { ok: true };
  });

  // ===== Activity Tracking =====
  
  // Track user activity (called from frontend)
  app.post('/api/activity/track', { preHandler: [app.auth] }, async (req: any) => {
    const body = z.object({
      sessionId: z.string().uuid(),
      actionType: z.enum(['page_view', 'api_call', 'document_edit', 'search', 'login', 'logout']),
      actionDetail: z.any().optional(),
      durationSeconds: z.number().optional()
    }).parse(req.body);

    const userId = req.user.sub;

    await pool.query(
      `INSERT INTO user_activity (user_id, session_id, action_type, action_detail, ip_address, user_agent, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, body.sessionId, body.actionType, JSON.stringify(body.actionDetail || {}), req.ip, req.headers['user-agent'], body.durationSeconds || 0]
    );

    // Update session last activity
    await pool.query(
      `UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1 AND user_id = $2`,
      [body.sessionId, userId]
    );

    return { ok: true };
  });

  // Start session
  app.post('/api/activity/session/start', { preHandler: [app.auth] }, async (req: any) => {
    const userId = req.user.sub;

    const result = await pool.query(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, req.ip, req.headers['user-agent']]
    );

    return { sessionId: result.rows[0].id };
  });

  // End session
  app.post('/api/activity/session/end', { preHandler: [app.auth] }, async (req: any) => {
    const body = z.object({
      sessionId: z.string().uuid()
    }).parse(req.body);

    await pool.query(
      `UPDATE user_sessions 
       SET ended_at = NOW(), is_active = FALSE 
       WHERE id = $1 AND user_id = $2`,
      [body.sessionId, req.user.sub]
    );

    return { ok: true };
  });

  // Get user activity (admin only)
  app.get('/api/admin/activity', { preHandler: [requireAdmin] }, async (req: any) => {
    const query = z.object({
      userId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      actionType: z.string().optional(),
      page: z.string().optional().transform(v => parseInt(v || '1')),
      limit: z.string().optional().transform(v => parseInt(v || '50'))
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (query.userId) {
      conditions.push(`a.user_id = $${paramIdx++}`);
      params.push(query.userId);
    }
    if (query.startDate) {
      conditions.push(`a.created_at >= $${paramIdx++}`);
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push(`a.created_at <= $${paramIdx++}`);
      params.push(query.endDate);
    }
    if (query.actionType) {
      conditions.push(`a.action_type = $${paramIdx++}`);
      params.push(query.actionType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [activity, total] = await Promise.all([
      pool.query(`
        SELECT a.*, u.email
        FROM user_activity a
        JOIN users u ON u.id = a.user_id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ${query.limit} OFFSET ${offset}
      `, params),
      pool.query(`SELECT COUNT(*) FROM user_activity a ${whereClause}`, params)
    ]);

    return {
      activity: activity.rows,
      total: parseInt(total.rows[0].count),
      page: query.page,
      totalPages: Math.ceil(parseInt(total.rows[0].count) / query.limit)
    };
  });

  // Get activity summary by date (for calendar view)
  app.get('/api/admin/activity/calendar', { preHandler: [requireAdmin] }, async (req: any) => {
    const query = z.object({
      userId: z.string().uuid().optional(),
      year: z.string().transform(v => parseInt(v)),
      month: z.string().transform(v => parseInt(v))
    }).parse(req.query);

    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 0);

    let userFilter = '';
    const params: any[] = [startDate.toISOString(), endDate.toISOString()];

    if (query.userId) {
      userFilter = 'AND user_id = $3';
      params.push(query.userId);
    }

    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_actions,
        SUM(duration_seconds) / 60 as total_minutes,
        ARRAY_AGG(DISTINCT action_type) as action_types
      FROM user_activity
      WHERE created_at >= $1 AND created_at <= $2 ${userFilter}
      GROUP BY DATE(created_at)
      ORDER BY date
    `, params);

    return { days: result.rows };
  });

  // Get detailed daily activity (for drill-down)
  app.get('/api/admin/activity/daily/:date', { preHandler: [requireAdmin] }, async (req: any) => {
    const { date } = req.params;
    const query = z.object({
      userId: z.string().uuid().optional()
    }).parse(req.query);

    let userFilter = '';
    const params: any[] = [date];

    if (query.userId) {
      userFilter = 'AND a.user_id = $2';
      params.push(query.userId);
    }

    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.email,
        COUNT(*) as actions_count,
        SUM(a.duration_seconds) / 60 as total_minutes,
        MIN(a.created_at) as first_activity,
        MAX(a.created_at) as last_activity,
        ARRAY_AGG(DISTINCT a.action_type) as action_types
      FROM user_activity a
      JOIN users u ON u.id = a.user_id
      WHERE DATE(a.created_at) = $1 ${userFilter}
      GROUP BY u.id, u.email
      ORDER BY total_minutes DESC
    `, params);

    return { users: result.rows };
  });

  // ===== Error Logs =====
  app.get('/api/admin/errors', { preHandler: [requireAdmin] }, async (req: any) => {
    const query = z.object({
      resolved: z.enum(['true', 'false', 'all']).optional().default('false'),
      errorType: z.string().optional(),
      page: z.string().optional().transform(v => parseInt(v || '1')),
      limit: z.string().optional().transform(v => parseInt(v || '50'))
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (query.resolved !== 'all') {
      conditions.push(`resolved = $${paramIdx++}`);
      params.push(query.resolved === 'true');
    }
    if (query.errorType) {
      conditions.push(`error_type = $${paramIdx++}`);
      params.push(query.errorType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [errors, total, types] = await Promise.all([
      pool.query(`
        SELECT e.*, u.email as user_email, r.email as resolved_by_email
        FROM system_error_logs e
        LEFT JOIN users u ON u.id = e.user_id
        LEFT JOIN users r ON r.id = e.resolved_by
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT ${query.limit} OFFSET ${offset}
      `, params),
      pool.query(`SELECT COUNT(*) FROM system_error_logs ${whereClause}`, params),
      pool.query(`SELECT DISTINCT error_type FROM system_error_logs ORDER BY error_type`)
    ]);

    return {
      errors: errors.rows,
      total: parseInt(total.rows[0].count),
      page: query.page,
      totalPages: Math.ceil(parseInt(total.rows[0].count) / query.limit),
      errorTypes: types.rows.map(r => r.error_type)
    };
  });

  // Mark error as resolved
  app.patch('/api/admin/errors/:errorId/resolve', { preHandler: [requireAdmin] }, async (req: any) => {
    const { errorId } = req.params;
    const body = z.object({
      notes: z.string().optional()
    }).parse(req.body);

    await pool.query(
      `UPDATE system_error_logs 
       SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1, notes = $2
       WHERE id = $3`,
      [req.user.sub, body.notes, errorId]
    );

    await logAdminAction(req.user.sub, 'resolve_error', 'error', errorId, { notes: body.notes }, req.ip);

    return { ok: true };
  });

  // Log error (internal use)
  app.post('/api/admin/errors/log', async (req) => {
    const body = z.object({
      errorType: z.string(),
      errorMessage: z.string(),
      errorStack: z.string().optional(),
      userId: z.string().uuid().optional(),
      requestPath: z.string().optional(),
      requestMethod: z.string().optional(),
      requestBody: z.any().optional()
    }).parse(req.body);

    await pool.query(
      `INSERT INTO system_error_logs 
       (error_type, error_message, error_stack, user_id, request_path, request_method, request_body, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [body.errorType, body.errorMessage, body.errorStack, body.userId, body.requestPath, body.requestMethod, JSON.stringify(body.requestBody), req.ip]
    );

    return { ok: true };
  });

  // ===== Audit Log =====
  app.get('/api/admin/audit', { preHandler: [requireAdmin] }, async (req: any) => {
    const query = z.object({
      adminId: z.string().uuid().optional(),
      action: z.string().optional(),
      page: z.string().optional().transform(v => parseInt(v || '1')),
      limit: z.string().optional().transform(v => parseInt(v || '50'))
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (query.adminId) {
      conditions.push(`al.admin_id = $${paramIdx++}`);
      params.push(query.adminId);
    }
    if (query.action) {
      conditions.push(`al.action ILIKE $${paramIdx++}`);
      params.push(`%${query.action}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [logs, total] = await Promise.all([
      pool.query(`
        SELECT al.*, u.email as admin_email
        FROM admin_audit_log al
        JOIN users u ON u.id = al.admin_id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ${query.limit} OFFSET ${offset}
      `, params),
      pool.query(`SELECT COUNT(*) FROM admin_audit_log al ${whereClause}`, params)
    ]);

    return {
      logs: logs.rows,
      total: parseInt(total.rows[0].count),
      page: query.page,
      totalPages: Math.ceil(parseInt(total.rows[0].count) / query.limit)
    };
  });

  // ===== System Overview (minimal file access) =====
  app.get('/api/admin/system/overview', { preHandler: [requireAdmin] }, async () => {
    const [
      storageUsage,
      recentProjects,
      activeJobs
    ] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_files,
          COALESCE(SUM(size), 0) as total_size_bytes,
          COALESCE(category, 'unknown') as category,
          COUNT(*) as category_count
        FROM project_files
        GROUP BY category
      `),
      pool.query(`
        SELECT p.id, p.name, p.created_at, u.email as owner_email,
               COUNT(DISTINCT d.id) as docs_count
        FROM projects p
        LEFT JOIN users u ON u.id = p.created_by
        LEFT JOIN documents d ON d.project_id = p.id
        GROUP BY p.id, u.email
        ORDER BY p.created_at DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT status, COUNT(*) as count
        FROM graph_fetch_jobs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY status
      `)
    ]);

    return {
      storage: {
        byCategory: storageUsage.rows
      },
      recentProjects: recentProjects.rows,
      activeJobs: activeJobs.rows
    };
  });

  // ===== Extended Statistics =====
  app.get('/api/admin/stats/extended', { preHandler: [requireAdmin] }, async () => {
    const [
      usersGrowth,
      projectsGrowth,
      activeUsersWeekly,
      topUsers,
      errorsByType,
      activityByType
    ] = await Promise.all([
      // Users created per day (last 30 days)
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      // Projects created per day (last 30 days)
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM projects
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      // Active users per day (last 7 days)
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as count
        FROM user_activity
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      // Top 10 users by projects count
      pool.query(`
        SELECT u.id, u.email, COUNT(p.id) as projects_count,
               (SELECT COUNT(*) FROM documents d JOIN projects pr ON d.project_id = pr.id WHERE pr.created_by = u.id) as documents_count,
               (SELECT COUNT(*) FROM project_articles pa JOIN projects pr ON pa.project_id = pr.id WHERE pr.created_by = u.id) as articles_count
        FROM users u
        LEFT JOIN projects p ON p.created_by = u.id
        GROUP BY u.id
        ORDER BY projects_count DESC
        LIMIT 10
      `),
      // Errors by type (last 7 days)
      pool.query(`
        SELECT error_type, COUNT(*) as count
        FROM system_error_logs
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY error_type
        ORDER BY count DESC
      `),
      // Activity by type (last 7 days)
      pool.query(`
        SELECT action_type, COUNT(*) as count, SUM(duration_seconds) / 60 as total_minutes
        FROM user_activity
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY action_type
        ORDER BY count DESC
      `)
    ]);

    return {
      usersGrowth: usersGrowth.rows,
      projectsGrowth: projectsGrowth.rows,
      activeUsersWeekly: activeUsersWeekly.rows,
      topUsers: topUsers.rows,
      errorsByType: errorsByType.rows,
      activityByType: activityByType.rows
    };
  });

  // ===== User Management Extended =====
  
  // Block/Unblock user
  app.patch('/api/admin/users/:userId/block', { preHandler: [requireAdmin] }, async (req: any) => {
    const { userId } = req.params;
    const body = z.object({ blocked: z.boolean(), reason: z.string().optional() }).parse(req.body);

    await pool.query(
      `UPDATE users SET is_blocked = $1, blocked_reason = $2, blocked_at = $3 WHERE id = $4`,
      [body.blocked, body.reason || null, body.blocked ? new Date() : null, userId]
    );

    await logAdminAction(req.user.sub, body.blocked ? 'block_user' : 'unblock_user', 'user', userId, { reason: body.reason }, req.ip);

    return { ok: true };
  });

  // Delete user (with all their data)
  app.delete('/api/admin/users/:userId', { preHandler: [requireAdmin] }, async (req: any) => {
    const { userId } = req.params;
    // Validate confirm flag
    z.object({ confirm: z.literal(true) }).parse(req.body);

    // Get user info before deletion
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (!user.rowCount) {
      return { error: 'User not found' };
    }

    // Delete in correct order (respecting foreign keys)
    await pool.query('DELETE FROM user_activity WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_subscriptions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_api_keys WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM project_members WHERE user_id = $1', [userId]);
    
    // Delete user's projects and related data
    const userProjects = await pool.query('SELECT id FROM projects WHERE created_by = $1', [userId]);
    for (const project of userProjects.rows) {
      await pool.query('DELETE FROM project_files WHERE project_id = $1', [project.id]);
      await pool.query('DELETE FROM project_articles WHERE project_id = $1', [project.id]);
      await pool.query('DELETE FROM documents WHERE project_id = $1', [project.id]);
      await pool.query('DELETE FROM project_members WHERE project_id = $1', [project.id]);
      await pool.query('DELETE FROM project_statistics WHERE project_id = $1', [project.id]);
    }
    await pool.query('DELETE FROM projects WHERE created_by = $1', [userId]);
    
    // Finally delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    await logAdminAction(req.user.sub, 'delete_user', 'user', userId, { email: user.rows[0].email }, req.ip);

    return { ok: true };
  });

  // Reset user password
  app.post('/api/admin/users/:userId/reset-password', { preHandler: [requireAdmin] }, async (req: any) => {
    const { userId } = req.params;
    const argon2 = await import('argon2');
    
    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    await pool.query(
      `UPDATE users SET password_hash = $1, password_reset_required = true WHERE id = $2`,
      [passwordHash, userId]
    );

    await logAdminAction(req.user.sub, 'reset_password', 'user', userId, {}, req.ip);

    return { tempPassword, message: 'Send this password to the user. They will be required to change it on next login.' };
  });

  // Get user's projects with details (without file contents)
  app.get('/api/admin/users/:userId/projects', { preHandler: [requireAdmin] }, async (req: any) => {
    const { userId } = req.params;
    const query = z.object({
      page: z.string().optional().transform(v => parseInt(v || '1')),
      limit: z.string().optional().transform(v => parseInt(v || '20'))
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;

    const [projects, total] = await Promise.all([
      pool.query(`
        SELECT 
          p.id, p.name, p.created_at, p.updated_at,
          COUNT(DISTINCT d.id) as documents_count,
          COUNT(DISTINCT pa.article_id) as articles_count,
          COUNT(DISTINCT pf.id) as files_count,
          COALESCE(SUM(pf.size), 0) as total_size
        FROM projects p
        LEFT JOIN documents d ON d.project_id = p.id
        LEFT JOIN project_articles pa ON pa.project_id = p.id
        LEFT JOIN project_files pf ON pf.project_id = p.id
        WHERE p.created_by = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, query.limit, offset]),
      pool.query('SELECT COUNT(*) FROM projects WHERE created_by = $1', [userId])
    ]);

    return {
      projects: projects.rows,
      total: parseInt(total.rows[0].count),
      page: query.page,
      totalPages: Math.ceil(parseInt(total.rows[0].count) / query.limit)
    };
  });

  // ===== Export Endpoints =====
  
  // Export users to CSV
  app.get('/api/admin/export/users', { preHandler: [requireAdmin] }, async (req: any, reply) => {
    const users = await pool.query(`
      SELECT 
        u.id, u.email, u.created_at, u.last_login_at, u.is_admin, u.is_blocked,
        COUNT(DISTINCT p.id) as projects_count,
        COALESCE(sub.status, 'free') as subscription_status
      FROM users u
      LEFT JOIN projects p ON p.created_by = u.id
      LEFT JOIN user_subscriptions sub ON sub.user_id = u.id
      GROUP BY u.id, sub.status
      ORDER BY u.created_at DESC
    `);

    const csv = [
      'ID,Email,Created At,Last Login,Is Admin,Is Blocked,Projects Count,Subscription',
      ...users.rows.map(u => 
        `${u.id},"${u.email}",${u.created_at},${u.last_login_at || ''},${u.is_admin},${u.is_blocked || false},${u.projects_count},${u.subscription_status}`
      )
    ].join('\n');

    await logAdminAction(req.user.sub, 'export_users', null, null, { count: users.rowCount }, req.ip);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename=users.csv');
    return csv;
  });

  // Export activity to CSV
  app.get('/api/admin/export/activity', { preHandler: [requireAdmin] }, async (req: any, reply) => {
    const query = z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }).parse(req.query);

    let whereClause = '';
    const params: any[] = [];

    if (query.startDate) {
      params.push(query.startDate);
      whereClause = `WHERE a.created_at >= $${params.length}`;
    }
    if (query.endDate) {
      params.push(query.endDate);
      whereClause += whereClause ? ` AND a.created_at <= $${params.length}` : `WHERE a.created_at <= $${params.length}`;
    }

    const activity = await pool.query(`
      SELECT a.id, u.email, a.action_type, a.created_at, a.duration_seconds, a.ip_address
      FROM user_activity a
      JOIN users u ON u.id = a.user_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT 10000
    `, params);

    const csv = [
      'ID,Email,Action Type,Created At,Duration (seconds),IP Address',
      ...activity.rows.map(a => 
        `${a.id},"${a.email}",${a.action_type},${a.created_at},${a.duration_seconds || 0},"${a.ip_address || ''}"`
      )
    ].join('\n');

    await logAdminAction(req.user.sub, 'export_activity', null, null, { count: activity.rowCount }, req.ip);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename=activity.csv');
    return csv;
  });

  // Export errors to CSV
  app.get('/api/admin/export/errors', { preHandler: [requireAdmin] }, async (req: any, reply) => {
    const errors = await pool.query(`
      SELECT e.id, e.error_type, e.error_message, e.created_at, e.resolved, 
             e.request_path, e.request_method, u.email as user_email
      FROM system_error_logs e
      LEFT JOIN users u ON u.id = e.user_id
      ORDER BY e.created_at DESC
      LIMIT 10000
    `);

    const csv = [
      'ID,Error Type,Message,Created At,Resolved,Request Path,Request Method,User Email',
      ...errors.rows.map(e => 
        `${e.id},"${e.error_type}","${(e.error_message || '').replace(/"/g, '""')}",${e.created_at},${e.resolved},"${e.request_path || ''}","${e.request_method || ''}","${e.user_email || ''}"`
      )
    ].join('\n');

    await logAdminAction(req.user.sub, 'export_errors', null, null, { count: errors.rowCount }, req.ip);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename=errors.csv');
    return csv;
  });

  // ===== Real-time Stats =====
  app.get('/api/admin/stats/realtime', { preHandler: [requireAdmin] }, async () => {
    const [
      onlineNow,
      activityLast5min,
      errorsLast1h
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions
        WHERE is_active = true AND last_activity_at >= NOW() - INTERVAL '5 minutes'
      `),
      pool.query(`
        SELECT action_type, COUNT(*) as count
        FROM user_activity
        WHERE created_at >= NOW() - INTERVAL '5 minutes'
        GROUP BY action_type
      `),
      pool.query(`
        SELECT error_type, COUNT(*) as count
        FROM system_error_logs
        WHERE created_at >= NOW() - INTERVAL '1 hour' AND NOT resolved
        GROUP BY error_type
        ORDER BY count DESC
      `)
    ]);

    return {
      onlineUsers: parseInt(onlineNow.rows[0]?.count || '0'),
      recentActivity: activityLast5min.rows,
      recentErrors: errorsLast1h.rows
    };
  });

  // ===== Client-side Error Logging =====
  app.post('/api/errors/client', async (req) => {
    const body = z.object({
      errorType: z.string(),
      errorMessage: z.string(),
      errorStack: z.string().optional(),
      url: z.string().optional(),
      userAgent: z.string().optional(),
      componentStack: z.string().optional()
    }).parse(req.body);

    // Try to get user from token if present
    let userId = null;
    try {
      await req.jwtVerify();
      userId = (req.user as any)?.sub;
    } catch {}

    await logSystemError(
      `client_${body.errorType}`,
      body.errorMessage,
      body.errorStack || body.componentStack || null,
      userId,
      body.url || null,
      'CLIENT',
      { userAgent: body.userAgent },
      req.ip
    );

    return { ok: true };
  });

  // ===== Bulk Operations =====
  app.post('/api/admin/errors/bulk-resolve', { preHandler: [requireAdmin] }, async (req: any) => {
    const body = z.object({
      errorIds: z.array(z.string().uuid()),
      notes: z.string().optional()
    }).parse(req.body);

    await pool.query(
      `UPDATE system_error_logs 
       SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1, notes = $2
       WHERE id = ANY($3::uuid[])`,
      [req.user.sub, body.notes, body.errorIds]
    );

    await logAdminAction(req.user.sub, 'bulk_resolve_errors', 'error', null, { count: body.errorIds.length }, req.ip);

    return { ok: true, resolvedCount: body.errorIds.length };
  });

  // ===== Session Management =====
  app.get('/api/admin/sessions/active', { preHandler: [requireAdmin] }, async () => {
    const sessions = await pool.query(`
      SELECT s.*, u.email
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.is_active = true
      ORDER BY s.last_activity_at DESC
      LIMIT 100
    `);

    return { sessions: sessions.rows };
  });

  app.post('/api/admin/sessions/:sessionId/terminate', { preHandler: [requireAdmin] }, async (req: any) => {
    const { sessionId } = req.params;

    await pool.query(
      `UPDATE user_sessions SET is_active = false, ended_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    await logAdminAction(req.user.sub, 'terminate_session', 'session', sessionId, {}, req.ip);

    return { ok: true };
  });
}
