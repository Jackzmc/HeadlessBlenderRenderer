<template>
<div class="box">
    <h4 class='title is-4'>User Settings</h4>
    <hr>
    <div class="columns">
        <div class="column">
        <b-field label="Username">
            <b-input :value="user.username" readonly disabled />
        </b-field>
        </div>
        <div class="column">
        <b-field label="Email">
            <b-input :value="user.email" readonly disabled />
        </b-field>
        </div>
    </div>
    <p>Only administrators can change your information.</p>
    <hr>
    <h6 class="title is-6">Change Password</h6>
    <form @submit.prevent="resetPass" >
    <b-field label="Current Password">
        <b-input type="password" v-model="current_password" required />
    </b-field>
    <b-field label="Password">
        <b-input type="password" v-model="new_password" required />
    </b-field>
    <b-field label="Confirm Password">
        <b-input type="password" v-model="password_confirm" required/>
    </b-field>
    <b-field>
        <b-button type="is-success" native-type="submit" tag="input" value="Change Password" />
    </b-field>
    </form>
</div>
</template>

<script>
import Axios from 'axios'
export default {
    props: ['server', 'user'],
    data() {
        return {
            current_password: null,
            new_password: null,
            password_confirm: null,
        }
    },
    methods: {
        resetPass() {
            if(this.new_password !== this.password_confirm) {
                return this.$buefy.toast.open({
                    message: 'Passwords do not match.',
                    type: 'is-danger',
                    duration: 5000
                })
            }
            Axios.post(`${this.server.address}/api/auth/resetpassword`,{
                current_password: this.current_password,
                new_password: this.new_password,
                password_confirm: this.password_confirm
            })
            .then(() => {
                this.$buefy.toast.open({
                    message: 'Successfully changed your password',
                    type: 'is-success',
                    duration: 3000
                })
            })
            .catch(err => {
                console.error('Change password failed', err)
                return this.$buefy.snackbar.open({
                    message: `Reset password failed: ${err.message}`,
                    type: 'is-danger',
                })
            }).finally(() => {
                this.current_password = null;
                this.new_password = null;
                this.password_confirm = null;
            })
        }
    },
}
</script>