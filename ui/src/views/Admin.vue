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
        <h3 class="title is-3">Server Management</h3>
        <p class="subtitle is-6">Manage the current users and the server settings.</p>
        <!-- TODO: add router-view when server settings is ever added -->
        <b-tabs type="is-toggle" @input="onTabChange">
            <b-tab-item label="Users">
                <hr>
                <div class="columns">
                    <div class="column is-8">
                        <h4 class="title is-4">Registered Users</h4>
                        <p class="subtitle is-6">Click on any user to edit</p>
                        <b-table :data="users" :selected.sync="selected" :loading="loading">
                            <template slot-scope="props">
                                <b-table-column field="username" label="Username">
                                    {{props.row.username}}
                                </b-table-column>
                                <b-table-column field="email" label="Email">
                                    {{props.row.email}}
                                </b-table-column>
                                <b-table-column field="permissions" label="Permissions">
                                    {{formatPermission(props.row.permissions) }}
                                </b-table-column>
                                <b-table-column label="Edit">
                                    <a @click="editUser(props.row)"><b-icon icon="pencil" /></a>
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
                        <h4 class="title is-4 has-text-centered">Edit User Info</h4>
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
                            <b-field label="Permissions" >
                                <b-tooltip label="The permission the user will have">
                                <b-select v-model="form.updateUser.permissions" :disabled="form.updateUser.permissions == 99">
                                    <option value="0">Restricted - View access</option>
                                    <option value="1">Normal - Unrestricted render access</option>
                                    <option value="2">Admin - Can manage users and settings as well</option>
                                    <option v-if="form.updateUser.permissions == 99" value="99">Default Admin - Cannot be changed/deleted.</option>
                                </b-select>
                                </b-tooltip>
                            </b-field>
                            <b-field>
                                <div class="buttons">
                                    <b-button type="is-success" native-type="submit" tag="input" value="Update">Update</b-button>
                                    <b-button :disabled="form.updateUser.permissions == 99" @click="deleteUser(selected)" type="is-danger"  icon-left="delete">Delete User</b-button>
                                    <b-button @click="selected = null" type="is-secondary" tag="input" value="Cancel">Cancel</b-button>
                                </div>
                            </b-field>
                        </form>
                    </div>
                    <div class="column" v-else>
                        <h4 class="title is-4 has-text-centered">Add User</h4>
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
                                <div class="buttons">
                                    <b-button type="is-success" native-type="submit" tag="input" value="Add User" />
                                    <b-button native-type="reset" type="is-secondary" tag="input" value="Reset">Reset</b-button>
                                </div>
                            </b-field>
                        </form>
                    </div>
                </div>
            </b-tab-item>
            <b-tab-item label="Server Settings">
                <hr>
                <b-message label="Notice" type="is-warning">This tab is currently in development.</b-message>
                <form @submit.prevent="updateSettings">
                    <div class="field">
                        <b-checkbox v-model="form.settings.extraShellArgs">Allow Extra Shell Arguments</b-checkbox>
                    </div>
                    <b-field>
                        <b-button type="is-success" tag="input" value="Save" />
                    </b-field>
                </form>
            </b-tab-item>
            <b-tab-item label="Info" value="info">
                <span v-if="serverInfo">
                    <b-message label="Error" v-if="serverInfo.error">
                        {{serverInfo.error}}
                    </b-message>
                    <table class="table">
                        <tr>
                            <th>OS</th>
                            <td>{{serverInfo.platform}}</td>
                        </tr>
                        <tr>
                            <th>Server Version</th>
                            <td>{{serverInfo.version}}</td>
                        </tr>
                        <tr>
                            <th>Date Started</th>
                            <td>{{startDate}}</td>
                        </tr>
                        <tr>
                            <th>CPU</th>
                            <td>{{serverInfo.cpu.name}}</td>
                        </tr>
                        <tr v-for="(gpu,index) in serverInfo.gpus" :key="index">
                            <th>GPU #{{index+1}}</th>
                            <td>{{gpu.name}}</td>
                        </tr>
                        <tr>
                            <th>Memory</th>
                            <td>{{serverInfo.memory.used | humanize}} / {{serverInfo.memory.total | humanize}}</td>
                        </tr>
                        <tr>
                            <th>Total Renders Completed</th>
                            <td>{{serverInfo.totalRenders}}</td>
                        </tr>
                    </table>
                </span>
            </b-tab-item>
        </b-tabs>
        
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
                },
                settings: {
                    extraShellArgs: false
                }
            },
            serverInfo: null
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
        startDate() {
            if(this.serverInfo.started) {
                const d = new Date(this.serverInfo.started);
                return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`
            }
            return null;
        }
    },
    methods: {
        onTabChange(type) {
            if(type === 'info' && !this.serverInfo) {
                Axios.get('/api/stats')
                .then(response => this.serverInfo = response.data)
                .catch(err => {
                    this.serverInfo.error = err.message;
                })
            }
        },
        formatPermission(number) {
            switch(parseInt(number)) {
                case 0: return "Restricted"
                case 1: return "Normal"
                case 2: return "Admin"
                case 99: return "Default Admin"
                default: return number;
            }
        },
        editUser(user) {
            Object.assign(this.form.updateUser, user)
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
    }
}
</script>