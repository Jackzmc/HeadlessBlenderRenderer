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
                        <tr>
                            <td>Local Server</td>
                            <td></td>
                            <td>{{ localStatus }}</td>
                            <td>
                                <b-button type="is-success" tag="router-link" to="/server/local">Connect</b-button>
                            </td>
                        </tr>
                        <tr v-for="server in servers" :key="server.id">
                            <td>{{server.name}}</td>
                            <td>{{server.address}}</td>
                            <td>{{server | formatStatus}}</td>
                            <td>
                                <div class="buttons">
                                    <b-button type="is-success" tag="router-link" :to="'/server/' + server.id">
                                        {{server.loggedin ? 'Connect' : 'Login'}}
                                    </b-button>
                                    <b-button type="is-danger" @click="deleteServer(server.id)" icon-left="delete"></b-button>
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
            servers: []
        }
    },
    created() {
        const storedServers = window.localStorage.getItem('blender_servers');
        if(storedServers) {
            const json = JSON.parse(storedServers);
            this.servers = json;
        }
        this.refreshStatus();
        //update status every 5 min
        setInterval(this.refreshStatus, 1000 * 60 * 5)
        this.$http.get('/api/render/status')
        .then(response => {
            this.localServerStatus = {
                state: "online",
                blend: response.data.blend,
                active: response.data.active
            }
        })
        .catch((err) => {
            console.warn(`Local server status check failed:`,err.message)
            if(err.message == "Network Error") {
                this.localServerStatus = {
                    state: "error",
                }
            }else{
                this.localServerStatus = {
                    state: "offline",
                }
            }
        })
    },
    methods: {
        refreshStatus() {
            this.servers.forEach((server,index) => {
                this.getStatus(server, index);
            })
        },
        getStatus(server, index) {
            if(!server || index === null || index === undefined) return console.warn('[getStatus] Missing/null parameters given.', server, index)
            this.$http.get(`${server.address}/api/render/status`)
            .then(response => {
                this.servers[index].status = "online"
                this.servers[index].data = {
                    blend: response.data.blend,
                    active: response.data.active,
                }
            })
            .catch((err) => {
                console.warn(`Server '${server.id}' status check failed:`,err.message)
                if(err.message == "Network Error") {
                    this.servers[index].status = "error"
                }else{
                    this.servers[index].status = "offline"
                }
            })
        },
        deleteServer(id) {
            for(let i=0; i < this.servers.length; i++) {
                if(this.servers[i].id === id) {
                    const server = this.servers[i];
                    this.$buefy.dialog.confirm({
                        title: 'Delete Server',
                        message: `Are you sure you want to delete the server <b>${server.name}</b>?<br><em>ID: ${server.id}</em>`,
                        confirmText: 'Delete',
                        type: 'is-warning',
                        hasIcon: true,
                        onConfirm: () => {
                            this.servers.splice(i, 1);
                            this.save();
                        }
                    })
                    break;
                }
            }
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
            const index = this.servers.push({
                id: this.safeName,
                name: this.form_addserver.name,
                address: this.form_addserver.address.replace(/\/$/,''),
                status: null,
            })
            this.getStatus(this.servers[index-1], index-1);
            this.save();
        },
        save() {
            window.localStorage.setItem('blender_servers', JSON.stringify(this.servers))
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
        localStatus() {
            if(!this.localServerStatus) return "Loading...";
            if(this.localServerStatus.active) return `Rendering - ${this.localServerStatus.blend}`
            if(this.localServerStatus.state === "offline") return "Offline";
            return "Idle"
        }
    },
    filters: {
        formatStatus({ status, data }) {
            if(!status || status === "loading") return "Loading..."
            if(status === "offline") return `Offline`
            if(status === "error") return `Errored`
            if(data.active) return `Rendering - ${data.blend}`
            return `Idle`
            
        }
    }
}
</script>