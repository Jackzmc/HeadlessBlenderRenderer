<template>
<div class="container">
    <br>
    <div class="columns">
        <div class="column"></div>
        <div class="column is-6">
            <div class="box">
                <span class="has-text-centered">
                <h2 class="title is-2">Login</h2>
                <p class="subtitle is-5">Don't have an account? Contact administators to create account.</p>
                </span>
                <form @submit.prevent="loginUser">
                    <b-field label="Username or Email">
                        <b-input type="text" v-model="login.username" icon="account" required />
                    </b-field>
                    <b-field label="Password">
                        <b-input type="password" v-model="login.password" icon="key" password-reveal required/>
                    </b-field>
                    <b-field>
                        <b-button tag="input" native-type="submit" type="is-success" value="Login" />
                    </b-field>
                </form>
            </div>
        </div>
        <div class="column"></div>
    </div>
</div>
</template>

<script>
export default {
    data() {
        return {
            login: {
                username: null,
                password: null,
            }
        }
    },
    methods: {
        loginUser() {
            this.$http.post('/api/auth/login',{...this.login})
            .then(response => {
                localStorage.setItem('blender_user', JSON.stringify(response.data.user))
                localStorage.setItem('blender_jwt', response.data.token)
                console.log('login', response.data)
                this.$emit('login', response.data.user)
                if(this.$route.params.nextUrl) {
                    this.$router.push(this.$route.params.nextUrl)
                }else{
                    this.$router.push('/')
                }
            })
            .catch(err => {
                this.$buefy.snackbar.open({
                    message: 'Login failed: ' + err.message
                })
            })
        }
    }
}
</script>