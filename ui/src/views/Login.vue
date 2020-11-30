<template>
<div class="container">
    <br>
    <div class="columns">
        <div class="column"></div>
        <div class="column is-6">
            <div class="box">
                <span class="has-text-centered">
                <h2 class="title is-2">Login</h2>
                <p class="subtitle is-5">Server: {{$route.params.server}}</p>
                <hr>
                <b-message title="Session expired" type="is-danger" aria-close-label="Close message" v-if="$route.query.expired">
                    Your login token for {{$route.params.server}} has expired, please login again.
                </b-message>
                <b-message type="is-success" aria-close-label="Close message" v-if="$route.query.loggedout">
                    You have successfully logged out.
                </b-message>
                <b-message title="Unauthorized" type="is-danger" aria-close-label="Close message" v-if="$route.query.unauthorized">
                    You do not have permission to view that page.
                </b-message>
                <p>Don't have an account? Contact administators to create account.</p>
                <br>
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
                <p v-if="$route.query.redirect">
                    <br>Redirecting to <em>{{$route.query.redirect}}</em> on login.
                </p>
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
                this.$store.commit('loginUser', {
                    user: response.data.user,
                    jwt: response.data.token,
                    serverid: this.$route.params.server
                })
                let currentUserCache = JSON.parse(window.sessionStorage.blender_userCache || "{}")
                currentUserCache[this.$route.params.server] = response.data.user;
                window.sessionStorage.setItem('blender_userCache', JSON.stringify(currentUserCache))
                this.$store.commit('saveServers')
                if(this.$route.query.redirect) {
                    this.$router.push(this.$route.query.redirect)
                }else{
                    this.$router.push(`/server/${this.$route.params.server}`)
                }
            })
            .catch(err => {
                if(err.response.status === 404) {
                    return this.$buefy.snackbar.open({
                        message: 'No account was found with that username or password'
                    })
                }else if(err.response.status === 401) {
                    this.$buefy.snackbar.open({
                        message: 'Username or password is invalid.'
                    })
                }else{
                    this.$buefy.snackbar.open({
                        message: `Login failed: ${err.message}`
                    })
                }
                
            })
        }
    },
    created() {
        //server does not exist.
        if(!this.$store.state.servers[this.$route.params.server]) {
            this.$router.push('/');
        }
    },
    computed: {
        server() {
            return this.$store.state.servers[this.$route.params.server]
        }
    }
}
</script>