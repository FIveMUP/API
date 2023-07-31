class User {
    constructor(userId, dbpool) {
        ;(this.userId = userId), (this.dbpool = dbpool)

        if (!this.userId) {
            throw new Error('userId is required')
        }

        if (!this.dbpool) {
            throw new Error('dbpool is required')
        }
    }

    async getUserData() {
        let conn

        try {
            conn = await this.dbpool.getConnection()
            const rows = await conn.query('SELECT * FROM users WHERE id = ?', [
                this.userId,
            ])

            if (rows.length <= 0) {
                return {
                    valid: false,
                    message: 'user does not exist',
                }
            }

            return {
                id: rows[0].id,
                username: rows[0].username,
                password: rows[0].password,
                rank: rows[0].rank,
                servers: JSON.parse(rows[0].servers),
            }
        } finally {
            if (conn) conn.release()
        }
    }
}

module.exports = User
