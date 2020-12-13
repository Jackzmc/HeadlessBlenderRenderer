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
        <div class="columns">
            <div class="column is-10">
                <h3 class="title is-3">Server Management</h3>
                <p class="subtitle is-6">Manage the current users and the server settings.</p>
            </div>
            <div class="column">
                <h3 class="title is-3">{{server.name}}</h3>
                <p class="subtitle is-6">{{server.address}}</p>
            </div>
        </div>
        <!-- TODO: add router-view when server settings is ever added -->
        <b-tabs type="is-toggle" @input="onTabChange">
            <b-tab-item label="Users">
                <hr>
                <h4 class="title is-4">Registered Users</h4>
                <p class="subtitle is-6">Click on any user to edit. The default user cannot be edited.</p>
                <b-table :data="users" :selected.sync="selected" @select="editUser" :loading="loading">
                    <b-table-column field="username" label="Username" v-slot="props">
                        <p>{{props.row.username}}</p>
                    </b-table-column>
                    <b-table-column field="email" label="Email" v-slot="props">
                        <p>{{props.row.email}}</p>
                    </b-table-column>
                    <b-table-column field="permissions" label="Permissions" v-slot="props">
                        <p>{{props.row.permissions == 99 ? 'Local Admin' : props.row.permissions}}</p>
                    </b-table-column>
                    <b-table-column field="last_login" label="Last Login" v-slot="props">
                        {{props.row.last_login ? getDate(props.row.last_login) : 'Never'}}
                    </b-table-column>
                    <b-table-column field="tokens" label="Render Tokens" v-slot="props">
                        {{props.row.tokens ? props.row.tokens.toLocaleString() : null}}
                    </b-table-column>
                    <b-table-column label="Edit" v-slot="props">
                        <a v-if="props.row.permissions < 99" @click="editUser(props.row)"><b-icon icon="pencil" /></a>
                    </b-table-column>
                    <template slot="empty">
                        <section class="section">
                            <div class="content has-text-grey has-text-centered">
                                <p>No registered users were found. Wait, what?</p>
                            </div>
                        </section>
                    </template>
                </b-table>
                <hr>
                <div class="columns">
                    <div class="column">
                        <p class="title is-4">Permission Flags Calculator</p>
                        <p class="subtitle is-6">Add all the flag bits together to calculate a permission number</p>
                        <div class="field" v-for="(flag,index) in $options.flags" :key="index">
                            <b-checkbox v-model="selectedFlags"
                                :native-value="getBit(index)" :disabled="selected != null">
                                {{index+1}}. {{flag.description}}
                            </b-checkbox>
                        </div>
                        <p><strong>Permission Number: </strong>{{permissionNumber}}</p>
                    </div>
                    <div class="column" v-if="selected">
                        <h5 class="title is-5 has-text-centered">Edit User Info</h5>
                        <form @submit.prevent="updateUser">
                            <b-field label="Username" message="Username can't be changed.">
                                <b-input type="text" v-model="form.updateUser.username" disabled readonly />
                            </b-field>
                            <b-field label="Email">
                                <b-input type="email" v-model="form.updateUser.email" />
                            </b-field>
                            <b-field label="Password (leave blank to keep current)">
                                <b-input type="password" v-model="form.updateUser.password"  />
                            </b-field>
                            <b-field label="Permissions">
                                <b-tooltip label="The permission the user will have. None will give the user restricted / view only.">
                                <b-select v-model="form.updateUser.permissions" multiple expanded>
                                    <option v-for="(flag,index) in $options.flags.slice(1)" :key="getBit(index)" :value="getBit(index)">
                                        {{flag.description}}
                                    </option>
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
                        <h5 class="title is-5 has-text-centered">Add User</h5>
                        <form @submit.prevent="addUser">
                            <b-field label="Username">
                                <b-input type="text" v-model="form.addUser.username" required/>
                            </b-field>
                            <b-field label="Email">
                                <b-input type="email" v-model="form.addUser.email" />
                            </b-field>
                            <b-field label="Password">
                                <b-input type="password" v-model="form.addUser.password" required />
                            </b-field>
                            <b-field label="Permissions">
                                <b-tooltip label="The permission the user will have. None will give the user restricted / view only.">
                                <b-select v-model="form.addUser.permissions" multiple expanded>
                                    <option v-for="(flag,index) in $options.flags.slice(1)" :key="++index" :value="index">
                                        {{flag.description}}
                                    </option>
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
            <b-tab-item label="Render Logs" value="logs">
                <VirtualList                    
                    style="height: 220px; overflow-y: auto;"
                    :data-key="'timestamp'"
                    :data-sources="serverLogs"
                    :keeps="12"
                    ref="serverlogs"
                    :data-component="$options.ListComponent"
                />
            </b-tab-item>
            <b-tab-item label="Server Settings" v-if="$NODE_ENV !== 'production'">
                <hr>
                <b-message label="Notice" type="is-warning">This tab is currently in development. Server-side functionality may not work at this time.</b-message>
                <form @submit.prevent="updateSettings">
                    <div class="field">
                        <b-checkbox v-model="form.settings.extraShellArgs">Allow Extra Shell Arguments</b-checkbox>
                    </div>
                    <div class="field">
                        <b-checkbox v-model="form.settings.statistics">Enable System Statistics (CPU, GPU, MEM info)</b-checkbox>
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
import ListComponent from '../components/ListComponent';
import VirtualList from 'vue-virtual-scroll-list';
import {flags} from '../data.json'

export default {
    ListComponent,
    components: {
        VirtualList
    },
    flags,
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
                    permissions: []
                },
                updateUser: {
                    username: null,
                    email: null,
                    password: null,
                    permissions: []
                },
                settings: {
                    extraShellArgs: false,
                    statistics: true
                }
            },
            serverInfo: null,
            serverLogs: [],
            serverLogs_Fetched: false,
            selectedFlags: []
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
        },
        permissionNumber() {
            return this.selectedFlags.reduce((acc, cv) => acc + parseInt(cv), 0)
        }
    },
    methods: {
        getDate(ms) {
            return new Date(ms).toLocaleString()
        },
        onTabChange(type) {
            if(type === 'info' && !this.serverInfo) {
                Axios.get('/api/stats')
                .then(response => this.serverInfo = response.data)
                .catch(err => {
                    this.serverInfo.error = err.message;
                })
            }else if(type === 'logs' && !this.serverLogs_Fetched) {
                Axios.get('/api/auth/logs')
                .then(response => this.serverLogs = response.data)
                .catch(err => {
                    this.serverLogs = [{timestamp: Date.now(), text: 'Failed to get server logs at this time.\n' + err.message}]
                })
                .finally(() => this.serverLogs_Fetched = true)
            }
            //don't need to fetch settings. server should have already have sent them?
        },
        editUser(user) {
            if(user.permissions == 99) {
                return setTimeout(() => this.selected = null, 1)
            }
            this.selectedFlags = dec2Bits(user.permissions)
            Object.assign(this.form.updateUser, {
                ...user,
                permissions: this.selectedFlags
            })
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
            let user = {...this.form.addUser};
            //Convert array of permissions ex: [0,1, 3] -> 0+1+3
            user.permissions = user.permissions.reduce((acc, cv) => acc +parseInt(cv), 0)
            Axios.post(`/api/auth/users/${this.form.addUser.username}`, user)
            .then(() => {
                this.users.push(user)
                this.$buefy.toast.open({
                    type: 'is-success',
                    duration: 3000,
                    message: `Added user '${user.username}' successfully`
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
            let updatedUser = {...this.form.updateUser}
            updatedUser.permissions = updatedUser.permissions.reduce((acc, cv) => acc + parseInt(cv), 0)
            Axios.put(`/api/auth/users/${this.selected.username}`, updatedUser)
            .then(() => {
                const index = this.users.findIndex(user => user.username === updatedUser.username)
                if(index >= 0 ) Object.assign(this.users[index], updatedUser);
                this.$buefy.toast.open({
                    type: 'is-success',
                    duration: 3000,
                    message: `Updated user '${updatedUser.username}' successfully`
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
        },
        getBit(index) {
            return 1 << index;
        }
    }
}
//Converts a decimal number (ex: 7) into its bits (1 + 2 + 4)
function dec2Bits(dec) {
    const bin = dec.toString(2); //convert dec -> bin
    const rev = [...bin].reverse().join('') //reverse str. could implement backwards for loop but this worked.
    const numbers = [];
    for (let i = 0; i < bin.length; i++) {
        const char = rev.charAt(i);
        if (char === '1') {
            numbers.push(1 << i)
        }
    }
    return numbers;
}
</script>