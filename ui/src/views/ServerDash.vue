<template>
<div>
    <br>
    <div class="container">
        <h1 class="title is-1">Blender Render UI - Servers</h1>
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
                        <tr v-for="server in servers" :key="server.id">
                            <td>{{server.name}}</td>
                            <td>{{server.address}}</td>
                            <td>{{server | formatStatus}}</td>
                            <td>
                                <div class="buttons">
                                    <b-button :disabled="server.status !== 'online'" type="is-success" tag="router-link" :to="'/server/' + server.id">Connect</b-button>
                                    <b-button type="is-danger" @click="deleteServer(server.id)" icon-left="delete"></b-button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="column">
                <h5 class="title is-5 has-text-centered">Add Server</h5>
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
            servers: [
                {
                    id: "local",
                    name: "Local Server",
                    address: "",
                    status: "loading",
                    data: {}
                },
                {
                    id: "staging",
                    name: "Staging",
                    address: "https://staging.blender.jackz.me",
                    status: "loading",
                    auth: ['ezra', 'JanhkXntY7pdJ8RsA6IS8MMDwc'],
                    data: {}
                }
            ]
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
    },
    methods: {
        refreshStatus() {
            this.servers.forEach((server,index) => {
                const auth = server.auth && Array.isArray(server.auth) && server.auth.length == 2 ? `${server.auth[0]}:${server.auth[1]}` : null;
                const Authorization = auth ? `Basic ${btoa(auth)}` : null
                Axios.get(`${server.address}/api/render/status`, {
                    headers: {
                        Authorization
                    }
                })
                .then(response => {
                    this.servers[index].status = "online"
                    this.servers[index].data = {
                        blend: response.data.blend,
                        active: response.data.active,
                    }
                })
                .catch((err) => {
                    console.warn(`Server ${server.id} status check failed:`,err.message)
                    if(err.message == "Network Error") {
                        this.servers[index].status = "error"
                    }else{
                        this.servers[index].status = "offline"
                    }
                })
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
                        onConfirm() {
                            this.servers.splice(i, 1);
                            this.save();
                        }
                    })
                    break;
                }
            }
        },
        save() {
            window.localStorage.setItem('blender_servers', JSON.stringify(this.servers))
        }
    },
    filters: {
        formatStatus({ status, data }) {
            if(status === "loading") return "Loading..."
            if(status === "offline") return `Offline`
            if(status === "error") return `Errored`
            if(data.active) return `Rendering - ${data.blend}`
            return `Idle`
            
        }
    }
}
</script>