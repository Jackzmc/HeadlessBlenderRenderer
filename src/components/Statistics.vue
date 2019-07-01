<template>
<div>
<b-field :label="'CPU Stats - ' + (cpu.name?cpu.name:'Unknown')">    
    <nav class="level">
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Usage %</p>
            <p class="title">{{text(cpu.usage,"%")}}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Temp</p>
            <p class="title"><span v-html="cm_temp(cpu.temp)"></span></p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Speed</p>
            <p class="title">{{text(cpu.speed,"GHz")}}</p>
            </div>
        </div>
    </nav>
</b-field>
<b-field label="Memory Stats">
    <nav class="level">
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Used</p>
            <p class="title">{{humanize(mem.used)}}</p>
            </div>
        </div>
        <div v-if="platform != 'win32'" class="level-item has-text-centered">
            <div>
            <p class="heading">Available</p>
            <p class="title">{{humanize(mem.available)}}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Free</p>
            <p class="title">{{humanize(mem.free)}}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Total</p>
            <p class="title">{{humanize(mem.total)}}</p>
            </div>
        </div>
    </nav>
</b-field>
<b-field label="GPU Stats" v-if="gpu.length == 0">
    No GPU found.
</b-field>
<b-field v-for="(gpu,index) in gpu" :key="index" :label="'GPU #' + ++index + ' Stats - ' + gpu.name">
    
    <nav class="level">
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Usage %</p>
            <p class="title">{{(gpu.usage>-1)?`${gpu.usage}%`:'n/a'}}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Temp</p>
            <p class="title"><span v-html="cm_temp(gpu.temp)"></span></p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Fan %</p>
            <p class="title">{{text(gpu.fan_speed,"%")}}</p>
            </div>
        </div>
        <div class="level-item has-text-centered">
            <div>
            <p class="heading">Memory</p>
            <p class="title">{{gpu.vram.current>-1?`${humanize(gpu.vram.current,true)}/${humanize(gpu.vram.total,true)}`:'n/a'}}</p>
            </div>
        </div>
    </nav>
</b-field>
</div>
</template>

<script>
import Buefy from 'buefy';
import 'buefy/dist/buefy.css'
export default {
    name:"stats",
    props:{
        platform:null,
        cpu:{
            type: Object,
            temp:-1,
            speed:-1,
            usage:-1
        },
        mem:{type:Object},
        gpu:{type:Array},
        celsius: {
            type:Boolean,
            default:false
        }
    },
    methods:{
        text(val,suffix) {
            if(val===-1) return "n/a";
            return val + " " + suffix;
        },
        cm_temp(val) {
            //val is celsius
            if(val===-1) return "n/a";
            let color = "";
            if(val >= 40 && val < 95) {
                color = "has-text-warning"
            }else if(val >= 203 ) {
                color = "has-text-danger"
            }

            if(this.celsius) {
                return `<span class='${color}'>${val}°C</span>`;
            }else{
                const f = Math.round(((9/5) * val)+32)
                return `<span class='${color}'>${f}°F</span>`;
            }
        },
        humanize(B,i) {
            var e=i?1e3:1024;if(Math.abs(B)<e)return B+" B";var a=i?["kB","MB","GB","TB","PB","EB","ZB","YB"]:["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"],t=-1;do B/=e,++t;while(Math.abs(B)>=e&&t<a.length-1);return B.toFixed(1)+" "+a[t]
        }
    }, 
    components: {
        Buefy
    }
}
</script>