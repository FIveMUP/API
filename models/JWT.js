class JWT {
    constructor() {
        ;(this.jwt = require('jsonwebtoken')), (this.expiresIn = '14d')
    }

    async createToken(payload) {
        return this.jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: this.expiresIn,
        })
    }

    async verifyToken(token) {
        return this.jwt.verify(token, process.env.JWT_SECRET)
    }

    async verifyTokenWithAuth(token, required_type) {
        const validToken = await this.verifyToken(token).catch((e) => {
            return {
                valid: false,
                message: `Invalid token: ${e.message}`,
            }
        })

        if (validToken?.message?.includes('Invalid token')) {
            return {
                valid: false,
                message: validToken.message,
            }
        }

        if (validToken?.type !== required_type) {
            return {
                valid: false,
                message: `${validToken?.type} not matching required auth type`,
            }
        }

        return validToken
    }
}

module.exports = JWT
