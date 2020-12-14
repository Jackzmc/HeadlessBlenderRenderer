export default interface User {
    username: string
    email: string
    permissions: number
    password?: string,
    created?: number,
    last_login?: number,
    tokens?: number,
    permissionBits?: number[]
}