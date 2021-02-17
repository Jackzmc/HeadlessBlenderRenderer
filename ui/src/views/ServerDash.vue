<template>
<div>
    <div id="btm_right_box">
        <div id="btm_right">
            <p><span style="vertical-align: middle; margin-right: 5px">v{{$VERSION}}</span><b-button @click="settings.active = true" icon-left="cog"></b-button></p>
        </div>
    </div>
    <b-modal 
        :active.sync="settings.active"
        trap-focus
        aria-role="dialog"
        aria-modal
    >
        <div class="modal-card" style="width: auto">
            <header class="modal-card-head">
                <p class="modal-card-title">Client Settings</p>
                <button
                    type="button"
                    class="delete"
                    @click="settings.active = false"/>
            </header>
            <section class="modal-card-body">
                <b-field label="Update Interval (minutes)" message="Zero to disable timer">
                    <b-slider v-model="settings.updateInterval" lazy :min="0" :max="120" format="raw" :step="10" ticks />
                </b-field>
                <hr>
                <p class="title is-5">Import</p>
                <b-field>
                    <b-input v-model="portText" rows="3" type="textarea"></b-input>
                </b-field>
                <div class="buttons">
                    <a class="button is-danger" @click="importStr(portText)">Import</a>
                    <a class="button is-danger" @click="portText = getExport()">Generate Export</a>
                </div>
            </section>
        </div>
    </b-modal>
    <br>
    <div class="container">
        <h1 class="title is-1">Headless Blender Render - Servers Dashboard</h1>
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
                        <tr v-for="(server, id) in $store.getters.servers" :key="id" :style="{color: server.status == 'offline' ? 'red': null}">
                            <td>{{server.name}}</td>
                            <td>{{server.address}}</td>
                            <td>{{formatStatus(server)}} </td>
                            <td>
                                <div class="buttons">
                                    <b-button v-if="server.status && server.status !== 'logged-out'" :type="server.status === 'online' ? 'is-success' : 'is-secondary'" tag="router-link" :to="'/server/' + id">
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
                <div v-if="Object.keys($store.getters.servers).length == 0" class="has-text-centered">
                    <p>No servers have been added. Add a server with the form on the right.</p><br>
                    <em>Host your own server with <a href="https://github.com/Jackzmc/HeadlessBlenderRenderer">Jackzmc/HeadlessBlenderRenderer</a></em>
                </div>
            </div>
            <div class="column">
                <h5 class="title is-5 has-text-centered">Add Server</h5>
                <form @submit.prevent="addServer">
                    <b-field label="Server Name" :message="addServerName">
                        <b-input v-model="form_addserver.name" type="text" placeholder="My Server" required />
                    </b-field>
                    <b-field label="Server Domain or Address" message="Must in the format of http(s)://site.com. Do not include /api/">
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
            settings: { active: false, updateInterval: 15},
            updateTimer: null,
            portText: null
        }
    },
    created() {
        /*if(this.$route.patchMatch === "/add") {
            const addr = findGetParameter('addr') || findGetParameter('address')
            const name = findGetParameter('name')
            if(!addr || !name) {
                console.warn('Detected /add route, but addr or name parameters are missing')
            }else{
                const id = getSafeId(name);
                console.log(id)
            }
        }
        console.log('add', this.$route.params)*/


        const settings = JSON.parse(window.localStorage.blender_settings|| "{}");
        this.settings = {...this.settings,...settings}
        //TODO: perhaps implement a slower update if its been offline
        if(this.settings.updateInterval > 0)
            this.updateTimer = setInterval(this.updateServers, 1000 * 60 * this.settings.updateInterval)
    },
    watch: {
        'settings.updateInterval': function() {
            let settings = Object.assign({}, this.settings);
            delete settings.active;
            window.localStorage.setItem('blender_settings', JSON.stringify(settings))

            clearInterval(this.updateTimer)
            if(this.settings.updateInterval > 0)
                this.updateTimer = setInterval(this.updateServers, 1000 * 60 * this.settings.updateInterval)
        }
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
            if(!status || status === "loading" || status === 'logged-out') return "Not Logged In"
            if(status === "offline" || status === "error") return `Offline`
            if(data.active) return `Rendering - ${data.blend}`
            return `Idle`
            
        },
        getExport() {
            let settings = Object.assign({}, this.settings);
            delete settings.active;
            return JSON.stringify({
                settings: {
                    client: settings,
                    options: JSON.parse(window.localStorage.getItem('blender_opts')),
                    servers: JSON.parse(window.localStorage.getItem('blender_servers')),
                    version: this.$VERSION
                }
            })
        },
        importStr(str) {
            const json = JSON.parse(str);
            const settings = JSON.stringify(json.client)
            const options = JSON.stringify(json.options)
            const servers = JSON.stringify(json.servers)

            window.localStorage.setItem('blender_settings', settings)
            window.localStorage.setItem('blender_opts', options)
            window.localStorage.setItem('blender_servers', servers)
        }
    },
    computed: {
        safeName() {
            if(!this.form_addserver.name) return ""
            return getSafeId(this.form_addserver.name)
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
function getSafeId(str) {
    if(!str) return null;
    return str.toLowerCase().replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')
}
/*function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
          tmp = item.split("=");
          if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}*/
</script>

<style scoped>
#btm_right {
    position: absolute;
    top: 0;
    right: 0;
    margin: 20px;
}
#btm_right_box {
    position: relative;
}
</style>