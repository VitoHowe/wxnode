import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError, ConflictError } from '@/middleware/errorHandler';
import { PasswordUtil } from '@/utils/password';

// 用户接口
interface User {
  id: number;
  openid?: string;
  unionid?: string;
  username?: string;
  password?: string;
  nickname?: string;
  avatar_url?: string;
  phone?: string;
  role_id: number;
  status: number;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// 微信用户创建参数
interface CreateWechatUserParams {
  openid: string;
  unionid?: string;
  nickname?: string;
  avatar_url?: string;
  phone?: string;
  role_id?: number;
}

// 普通用户创建参数
interface CreateNormalUserParams {
  username: string;
  password: string;
  nickname?: string;
  avatar_url?: string;
  phone?: string;
  role_id?: number;
}

// 创建用户参数（兼容两种类型）
type CreateUserParams = CreateWechatUserParams | CreateNormalUserParams;

// 更新用户参数
interface UpdateUserParams {
  nickname?: string;
  avatar_url?: string;
  phone?: string;
  role_id?: number;
  status?: number;
  last_login_at?: Date;
}

// 查询用户参数
interface GetUsersParams {
  page: number;
  limit: number;
  keyword?: string;
  role_id?: number;
  status?: number;
}

class UserService {
  /**
   * 根据角色名称获取角色ID
   */
  async getRoleByName(name: 'user' | 'admin' | 'super_admin'): Promise<{ id: number; name: string } | null> {
    try {
      const sql = 'SELECT id, name FROM roles WHERE name = ? LIMIT 1';
      const rows = await query(sql, [name]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('根据角色名称获取角色失败:', error);
      throw error;
    }
  }
  /**
   * 根据openid获取用户
   */
  async getUserByOpenid(openid: string): Promise<User | null> {
    try {
      const sql = 'SELECT * FROM users WHERE openid = ? LIMIT 1';
      const users = await query(sql, [openid]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('根据openid获取用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const sql = 'SELECT * FROM users WHERE username = ? LIMIT 1';
      const users = await query(sql, [username]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('根据用户名获取用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      const sql = `
        SELECT u.*, r.name as role_name, r.permissions as role_permissions
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ? LIMIT 1
      `;
      const users = await query(sql, [id]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('根据ID获取用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建微信用户
   */
  async createWechatUser(params: CreateWechatUserParams): Promise<User> {
    const {
      openid,
      unionid,
      nickname = '微信用户',
      avatar_url = '',
      phone,
      role_id = 2, // 默认为普通用户角色
    } = params;

    try {
      // 检查openid是否已存在
      const existingUser = await this.getUserByOpenid(openid);
      if (existingUser) {
        throw new ConflictError('用户已存在');
      }

      // 将undefined转换为null，确保数据库兼容性
      const safeParams = [
        openid,
        unionid ?? null,
        null, // username
        null, // password
        nickname,
        avatar_url,
        phone ?? null,
        role_id
      ];

      const sql = `
        INSERT INTO users (openid, unionid, username, password, nickname, avatar_url, phone, role_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      logger.info('创建微信用户参数:', { 
        openid: openid.substring(0, 8) + '***', 
        hasUnionid: !!unionid,
        nickname,
        role_id 
      });
      
      const result = await query(sql, safeParams);
      
      const newUser = await this.getUserById(result.insertId);
      if (!newUser) {
        throw new Error('创建用户后获取用户信息失败');
      }

      logger.info(`微信用户创建成功: ID=${newUser.id}, openid=${openid.substring(0, 8)}***`);
      return newUser;
    } catch (error) {
      logger.error('创建微信用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建普通用户
   */
  async createNormalUser(params: CreateNormalUserParams): Promise<User> {
    const {
      username,
      password,
      nickname = username,
      avatar_url = '',
      phone,
      role_id = 2, // 默认为普通用户角色
    } = params;

    try {
      // 检查用户名是否已存在
      const existingUser = await this.getUserByUsername(username);
      if (existingUser) {
        throw new ConflictError('用户名已存在');
      }

      // 验证密码强度
      const passwordValidation = PasswordUtil.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      // 加密密码
      const hashedPassword = await PasswordUtil.hashPassword(password);

      const safeParams = [
        null, // openid
        null, // unionid
        username,
        hashedPassword,
        nickname,
        avatar_url,
        phone ?? null,
        role_id
      ];

      const sql = `
        INSERT INTO users (openid, unionid, username, password, nickname, avatar_url, phone, role_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      logger.info('创建普通用户参数:', { 
        username,
        nickname,
        role_id 
      });
      
      const result = await query(sql, safeParams);
      
      const newUser = await this.getUserById(result.insertId);
      if (!newUser) {
        throw new Error('创建用户后获取用户信息失败');
      }

      logger.info(`普通用户创建成功: ID=${newUser.id}, username=${username}`);
      return newUser;
    } catch (error) {
      logger.error('创建普通用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建用户（兼容接口）
   */
  async createUser(params: CreateUserParams): Promise<User> {
    if ('openid' in params) {
      return this.createWechatUser(params);
    } else {
      return this.createNormalUser(params);
    }
  }

  /**
   * 验证用户密码
   */
  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByUsername(username);
      if (!user || !user.password) {
        return null;
      }

      const isValidPassword = await PasswordUtil.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      return user;
    } catch (error) {
      logger.error('验证用户密码失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户
   */
  async updateUser(id: number, params: UpdateUserParams): Promise<User> {
    try {
      // 检查用户是否存在
      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('用户不存在');
      }

      // 构建更新SQL
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          // 确保null值正确传递给数据库
          updateValues.push(value === null ? null : value);
        }
      });

      if (updateFields.length === 0) {
        return existingUser;
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      
      logger.debug('更新用户SQL:', { sql, updateFields, userId: id });
      await query(sql, updateValues);

      const updatedUser = await this.getUserById(id);
      if (!updatedUser) {
        throw new Error('更新用户后获取用户信息失败');
      }

      logger.info(`用户更新成功: ID=${id}`);
      return updatedUser;
    } catch (error) {
      logger.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户列表
   */
  async getUsers(params: GetUsersParams): Promise<{ users: User[]; total: number; pagination: any }> {
    const { page, limit, keyword, role_id, status } = params;
    const offset = (page - 1) * limit;

    try {
      // 构建查询条件
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (keyword) {
        whereConditions.push('(u.nickname LIKE ? OR u.phone LIKE ?)');
        queryParams.push(`%${keyword}%`, `%${keyword}%`);
      }

      if (role_id !== undefined) {
        whereConditions.push('u.role_id = ?');
        queryParams.push(role_id);
      }

      if (status !== undefined) {
        whereConditions.push('u.status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM users u 
        ${whereClause}
      `;
      const countResult = await query(countSql, queryParams);
      const total = countResult[0].total;

      // 获取用户列表
      const sql = `
        SELECT u.*, r.name as role_name, r.permissions as role_permissions
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        ${whereClause}
        ORDER BY u.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const users = await query(sql, [...queryParams, limit, offset]);

      return {
        users,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<void> {
    try {
      // 检查用户是否存在
      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('用户不存在');
      }

      // 软删除：将状态设为0
      await this.updateUser(id, { status: 0 });

      logger.info(`用户删除成功: ID=${id}`);
    } catch (error) {
      logger.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据手机号获取用户
   */
  async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const sql = 'SELECT * FROM users WHERE phone = ? LIMIT 1';
      const users = await query(sql, [phone]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('根据手机号获取用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<any> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = 1 THEN 1 END) as active_users,
          COUNT(CASE WHEN status = 0 THEN 1 END) as inactive_users,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_new_users,
          COUNT(CASE WHEN DATE(last_login_at) = CURDATE() THEN 1 END) as today_active_users
        FROM users
      `;
      
      const result = await query(sql);
      return result[0];
    } catch (error) {
      logger.error('获取用户统计信息失败:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
