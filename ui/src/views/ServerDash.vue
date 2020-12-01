<template>
<div>
    <br>
    <div class="container">
        <h1 class="title is-1">Blender Render UI - Server Dashboard</h1>
        <div class="columns">
            <div class="column is-8">
                <table class="table is-fullwidth">
                    <thead>
                        <tr>
                            <th>Server Name</th>
                            <th>Address</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- <tr>
                            <td>Local Server</td>
                            <td></td>
                            <td>{{ localStatus }}</td>
                            <td>
                                <b-button type="is-success" tag="router-link" to="/server/local">Connect</b-button>
                            </td>
                        </tr> -->
                        <tr v-for="(server, id) in $store.getters.servers" :key="id" :style="{color: server.status != 'online' ? 'red': null}">
                            <td>{{server.name}}</td>
                            <td>{{server.address}}</td>
                            <td>{{formatStatus(server)}} </td>
                            <td>
                                <div class="buttons">
                                    <b-button v-if="server.status" :type="server.status === 'online' ? 'is-success' : 'is-secondary'" tag="router-link" :to="'/server/' + id">
                                        Connect
                                    </b-button>
                                    <b-button v-else type="is-success" tag="router-link" :to="{path: '/login/' + id, query: { redirect: '/server/' + id}} ">
                                        Login
                                    </b-button>
                                    <b-button type="is-danger" @click="deleteServer(server)" icon-left="delete"></b-button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="column">
                <h5 class="title is-5 has-text-centered">Add Server</h5>
                <form @submit.prevent="addServer">
                    <b-field label="Server Name" :message="addServerName">
                        <b-input v-model="form_addserver.name" type="text" placeholder="My Server" required />
                    </b-field>
                    <b-field label="Address" message="Must in the format of http(s)://site.com">
                        <b-input v-model="form_addserver.address" type="text" placeholder="https://blender.mysite.com/" required pattern="(https?:\/\/)(.*)" />
                    </b-field>
                    <b-field>
                        <b-button tag="input" native-type="submit" type="is-success" value="Add Server" />
                    </b-field>
                </form>
            </div>
        </div>
    </div>
</div>
</template>

<script>
const URL_REGEX = new RegExp(/(https?):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?$/)
export default {
    data() {
        return {
            form_addserver: {
                name: null,
                address: null
            },
            localServerStatus: null,
        }
    },
    created() {
        this.updateServers();
        setInterval(this.updateServers, 1000 * 60 * 5)
    },
    methods: {
        deleteServer(server) {
            this.$buefy.dialog.confirm({
                title: 'Delete Server',
                message: `Are you sure you want to delete the server <b>${server.name}</b>?<br><em>ID: ${server.id}</em>`,
                confirmText: 'Delete',
                type: 'is-warning',
                hasIcon: true,
                onConfirm: () => {
                    this.$store.commit('removeServer', server.id)
                    this.$store.commit('saveServers')
                }
            })
        },
        addServer() {
            if(this.safeName.length == 0) {
                return this.$buefy.toast.open({
                    message: 'Invalid name, must contain at least some alphanumeric characters.',
                    type: 'is-danger',
                    duration: 5000
                })
            }
            if(!URL_REGEX.test(this.form_addserver.address)) {
                return this.$buefy.toast.open({
                    message: 'Specified address is not a valid URL.',
                    type: 'is-danger',
                    duration: 5000
                })
            }
            console.log('add user', {
                id: this.safeName,
                name: this.form_addserver.name,
                address: this.form_addserver.address.replace(/\/$/,''),
                status: null,
            })
            this.$store.commit('loadServer',{
                id: this.safeName,
                name: this.form_addserver.name,
                address: this.form_addserver.address.replace(/\/$/,''),
                status: null,
            })
            this.$store.dispatch('refreshStatus', this.$store.state[this.safeName])
            this.$store.commit('saveServers')
        },
        updateServers() {
            for(const key in this.$store.state.servers) {
                this.$store.dispatch('refreshStatus', this.$store.state.servers[key])
            }
        },
        formatStatus({ status, data }) {
            if(!status || status === "loading") return "Not Logged In"
            if(status === "offline" || status === "error") return `Offline`
            if(data.active) return `Rendering - ${data.blend}`
            return `Idle`
            
        }
    },
    computed: {
        safeName() {
            if(!this.form_addserver.name) return ""
            return this.form_addserver.name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')
        },
        addServerName() {
            if(!this.form_addserver.name) return ""
            return `ID: ${this.safeName}`
        },
        servers() {
            const arr = [];
            for(const id in this.$store.getters.servers) {
                arr.push({
                    id,
                    ...this.$store.getters.servers[id]
                })
            }
            return arr;
        }
    },
}
</script>