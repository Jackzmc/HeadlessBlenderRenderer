<template>
<div v-if="!initial">
<b-field :label="cpuName">    
    <nav class="level">
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Usage %</p>
            <p class="title">{{stats.cpu.usage | addSuffix("%") }}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Temp</p>
            <p class="title"><span v-html="cm_temp(stats.cpu.temp)"></span></p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Speed</p>
            <p class="title">{{stats.cpu.speed | addSuffix(" GHz") }}</p>
            </div>
        </div>
    </nav>
</b-field>
<b-field label="Memory Stats">
    <nav class="level">
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Used</p>
            <p class="title">{{stats.memory.used | humanize}}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Available</p>
            <p class="title">{{stats.memory.available | humanize}}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Total</p>
            <p class="title">{{stats.memory.total | humanize}}</p>
            </div>
        </div>
    </nav>
</b-field>
<b-field label="GPU Stats" v-if="stats.gpus.length == 0">
    <nav class="level">
        <div class="level-item has-text-centered">
            <div>
            No GPUs found
            </div>
        </div>
    </nav>
</b-field>
<b-field v-for="(stat, index) in stats.gpus" :key="index" :label="'GPU #' + ++index + ' Stats - ' + stat.name">
    
    <nav class="level">
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Usage %</p>
            <p class="title">{{ stat.usage | addSuffix('%') }}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Temp</p>
            <p class="title"><span v-html="cm_temp(stat.temp)"></span></p>
            </div>
        </div>
        <div class="level-item has-text-centered" v-if="stat.fan_speed">
            <div>
            <p class="heading">Fan %</p>
            <p class="title">{{ stat.fan_speed | addSuffix("%") }}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Memory</p>
            <p class="title" v-if="stat.vram.current >= 0">{{stat.vram.current | humanize}}/{{stat.vram.total | humanize}}</p>
            <p class="title" v-else>?</p>
            </div>
        </div>
    </nav>
</b-field>
</div>
</template>

<script>
import semvar from 'semver-compare'
export default {
    name:"Statistics",
    props:{
        use_celsius: {
            type:Boolean,
            default: true
        },
        socket: Object,
        version: String
    },
    data() {
        return {
            stats: {
                platform: null,
                cpu: {
                    type: null,
                    temp: -1,
                    speed: -1,
                    usage: -1
                },
                memory: { type: null, used: -1, total: -1 },
                gpus: []
            },
            initial: true
        }
    },
    methods:{
        add_suffix(val,suffix) {
            if(val === -1) return "?";
            return val + " " + suffix;
        },
        cm_temp(val) {
            //val is celsius
            if(val === -1) return "n/a";
            let color = "";
            if(val >= 40 && val < 95) {
                color = "has-text-orange"
            }else if(val >= 203 ) {
                color = "has-text-danger"
            }

            if(this.use_celsius) {
                return `<span class='${color}'>${val}°C</span>`;
            }else{
                const f = Math.round(((9/5) * val)+32)
                return `<span class='${color}'>${f}°F</span>`;
            }
        },
    }, 
    mounted() {
        this.socket.on('stat', (data) => {
            if(!data) return;
            if(!this.initial && data.ui_version && semvar(data.ui_version,this.$VERSION) == 1) {
                console.info(`Current Version: ${this.$VERSION} | Latest: ${data.ui_version}`)
                this.$buefy.snackbar.open({
                    message: `Detected new version of Web UI (v${data.ui_version})`,
                    type: 'is-warning',
                    indefinite:true,
                    position: 'is-top',
                    actionText: 'Reload',
                    onAction: () => {
                        window.location.reload();
                    }
                })
            }
            this.$emit('update:version', data.version)
            if(this.initial) this.initial = false;
            this.stats = data;
        })
    },
    computed: {
        cpuName() {
            return this.stats.cpu.name ? `CPU Stats - ${this.stats.cpu.name}` : 'CPU Stats'
        }
    },
    filters: {
        addSuffix(value, type) {
            if(value === -1) return "?";
            return `${value}${type}`
        }
    }
}
</script>

<style>
.has-text-orange {
    color: orange;
}
</style>