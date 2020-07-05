<template>
<div>
    <b-navbar>
        <template slot="brand">
            <b-navbar-item tag="router-link" to="/">
                <h4 class="title is-4">Blender Render UI</h4>
            </b-navbar-item>
        </template>
        <template slot="start">
            <b-navbar-item tag="router-link" to="/">
                Dashboard
            </b-navbar-item>
            <b-navbar-item tag="router-link" :to="'/server/' + $route.params.server">
                Server Panel
            </b-navbar-item>
        </template>
        <template slot="end">
            
        </template>
    </b-navbar>
    <br>
    <div class="container">
        <h3 class="title is-3">Admin Control Panel</h3>
        <p class="subtitle is-6">Manage the current users and the server settings.</p>
        <!-- TODO: add router-view when server settings is ever added -->
        <hr>
        <div class="columns">
            <div class="column is-8">
                <h4 class="title is-4">Registered Users</h4>
                <b-table :data="users" :selected.sync="selected" :loading="loading" @select="onSelect">
                    <template slot-scope="props">
                        <b-table-column field="username" label="Username">
                            {{props.row.username}}
                        </b-table-column>
                        <b-table-column field="email" label="Email">
                            {{props.row.email}}
                        </b-table-column>
                        <b-table-column field="permissions" label="Permissions">
                            {{props.row.permissions | formatPermission }}
                        </b-table-column>
                    </template>
                    <template slot="empty">
                         <section class="section">
                            <div class="content has-text-grey has-text-centered">
                                <p>No registered users were found. Wait, what?</p>
                            </div>
                        </section>
                    </template>
                </b-table>
            </div>
            <div class="column" v-if="selected">
                <h4 class="title is-4 has-text-centered">Editing user '{{selected.username}}'</h4>
                <form @submit.prevent="updateUser">
                    <b-field label="Username" message="Username can't be changed.">
                        <b-input type="text" v-model="form.updateUser.username" disabled readonly />
                    </b-field>
                    <b-field label="Email">
                        <b-input type="email" v-model="form.updateUser.email" required />
                    </b-field>
                    <b-field label="Password (leave blank to keep current)">
                        <b-input type="password" v-model="form.updateUser.password"  />
                    </b-field>
                    <b-field label="Permissions">
                        <b-tooltip label="The permission the user will have">
                        <b-select v-model="form.updateUser.permissions">
                            <option value="0">Restricted - View access</option>
                            <option value="1">Normal - Unrestricted render access</option>
                            <option value="2">Admin - Can manage users and settings as well</option>
                        </b-select>
                        </b-tooltip>
                    </b-field>
                    <b-field>
                        <div class="buttons">
                            <b-button type="is-success" native-type="submit" tag="input" value="Update User" />
                            <b-button @click="deleteUser(selected)" type="is-danger"  icon-left="delete">Delete User</b-button>
                        </div>
                    </b-field>
                </form>
            </div>
        </div>
        <hr>
        <div class="columns">
            <div class="column is-4">
                <h4 class="title is-4">Add User</h4>
                <form @submit.prevent="addUser">
                    <b-field label="Username">
                        <b-input type="text" v-model="form.addUser.username" required/>
                    </b-field>
                    <b-field label="Email">
                        <b-input type="email" v-model="form.addUser.email" required />
                    </b-field>
                    <b-field label="Password">
                        <b-input type="password" v-model="form.addUser.password" required />
                    </b-field>
                    <b-field label="Permissions">
                        <b-tooltip label="The permission the user will have">
                        <b-select v-model="form.addUser.permissions">
                            <option value="0">Restricted - View access</option>
                            <option value="1">Normal - Unrestricted render access</option>
                            <option value="2">Admin - Can manage users and settings as well</option>
                        </b-select>
                        </b-tooltip>
                    </b-field>
                    <b-field>
                        <b-button type="is-success" native-type="submit" tag="input" value="Add User" />
                    </b-field>
                </form>
            </div>
        </div>
    </div>

</div>
</template>

<script>
import Axios from 'axios'
export default {
    data() {
        return {
            users: [],
            loading: true,
            selected: null,
            form: {
                addUser: {
                    username: null,
                    email: null,
                    password: null,
                    permissions: 0
                },
                updateUser: {
                    username: null,
                    email: null,
                    password: null,
                    permissions: 0
                }
            }
        }
    },
    created() {
        Axios.defaults.baseURL = this.server.address;
        Axios.defaults.headers.common['Authorization'] = this.server.jwt;
        Axios.interceptors.response.use(response => {
            return response;
        }, (error)  =>{
            if (error.response  && 401 === error.response.status) {
                this.$router.push({
                    path: `/login/${this.$route.params.server}`,
                    query: { redirect: `/server/${this.$route.params.server}`, expired: true, ret: 6}
                })
            } else {
                return Promise.reject(error);
            }
        });
        this.refreshUsers()
    },
    computed: {
        server() {
            return this.$store.state.servers[this.$route.params.server];
        },
        user() {
            return this.$store.state.users[this.$route.params.server]
        },
        baseURL() {
            return this.server.address;
        },
    },
    methods: {
        onSelect(selection) {
            Object.assign(this.form.updateUser, selection)
        },
        refreshUsers() {
            this.loading = true;
            Axios.get('/api/auth/users')
            .then(response => {
                this.users = response.data
            })
            .catch(err => {
                this.$buefy.snackbar.open({
                    type: 'is-danger',
                    message: `Fetching users failed: ${err.message}`
                })
            })
            .finally(() => this.loading = false)
        },
        addUser() {
            Axios.post(`/api/auth/users/${this.form.addUser.username}`, {...this.form.addUser})
            .then(() => {
                this.users.push(this.form.addUser)
                this.$buefy.toast.open({
                    type: 'is-success',
                    duration: 3000,
                    message: `Added user '${this.form.addUser.username}' successfully`
                })
            })
            .catch(err => {
                this.$buefy.snackbar.open({
                    type: 'is-danger',
                    message: `Failed to add user: ${err.message}`
                })
            })
        },
        updateUser() {
            Axios.put(`/api/auth/users/${this.selected.username}`, {...this.form.updateUser})
            .then(() => {
                const index = this.users.findIndex(user => user.username === this.selected.username)
                if(index >= 0 ) Object.assign(this.users[index],this.form.updateUser);
                this.$buefy.toast.open({
                    type: 'is-success',
                    duration: 3000,
                    message: `Updated user '${this.selected.username}' successfully`
                })
            })
            .catch(err => {
                this.$buefy.snackbar.open({
                    type: 'is-danger',
                    message: `Failed to add user: ${err.message}`
                })
            })
        },
        deleteUser(user) {
            this.$buefy.dialog.confirm({
                title: 'Delete User',
                message: `Are you sure you want to delete the user <b>${user.username}</b>?`,
                confirmText: 'Delete',
                type: 'is-warning',
                hasIcon: true,
                onConfirm: () => {
                    Axios.delete(`/api/auth/users/${this.selected.username}`)
                    .then(() => {
                        const index = this.users.findIndex(user => user.username === this.selected.username)
                        if(index >= 0 ) delete this.users[index]
                        this.$buefy.toast.open({
                            type: 'is-success',
                            duration: 3000,
                            message: `Deleted user '${this.selected.username}' successfully`
                        })
                    })
                    .catch(err => {
                        this.$buefy.snackbar.open({
                            type: 'is-danger',
                            message: `Failed to delete user: ${err.message}`
                        })
                    })
                }
            })
        }
    },
    filters: {
        formatPermission(number) {
            switch(parseInt(number)) {
                case 0: return "Restricted"
                case 1: return "Normal"
                case 2: return "Admin"
                default: return number;
            }
        }
    }
}
</script>