<template>
<div class="container">
    <br>
    <div class="columns">
        <div class="column"></div>
        <div class="column is-6">
            <div class="box has-text-centered">
                <h2 class="title is-2">Login</h2>
                <p class="subtitle is-5">Don't have an account? Contact administators to create account.</p>
                <form @submit.prevent="loginUser">
                    <b-field label="Username or Email">
                        <b-input type="text" v-model="login.username" icon="account" />
                    </b-field>
                    <b-field label="Password">
                        <b-input type="password" v-model="login.password" icon="key" password-reveal/>
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
            .then(r => {
                console.log('login', r.data)
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