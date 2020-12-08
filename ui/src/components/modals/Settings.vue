<template>
<div class="box">
    <h3 class='title is-3'>Settings</h3>
    <hr>
    <b-field label="Temperature Type">
        <b-field>
            <b-radio-button v-model="temperature" native-value="celsius">
                <b-icon icon="temperature-celsius"></b-icon>
                <span>Celsius</span>
            </b-radio-button>
            <b-radio-button v-model="temperature" native-value="fahrenheit">
                <b-icon icon="temperature-fahrenheit"></b-icon>
                <span>Fahrenheit</span>
            </b-radio-button>
        </b-field>
    </b-field>
    <b-field label="Socket" message="Socket is responsibile for showing logs, statistics, current frame information, and uploading files. Only disable to save bandwidth.">
        <b-tooltip label="Currently not implemented for Web UI." position="is-right">
        <b-switch disabled v-model="socket_enabled">
            {{socket_enabled?"Enabled":"Disabled"}}
        </b-switch>
        </b-tooltip>
        
    </b-field>
    <hr>
    <b-button @click="save" type="is-success">
        <b-icon icon="content-save" />
        <span>Save Settings</span>
    </b-button>
</div>
</template>

<script>
export default {
    props: ['default'],
    data() {
        return {
            temperature: 'celsius',
            socket_enabled: true
        }
    },
    methods: {
        save() {
            const saveObject = {
                use_celsius: this.temperature === 'celsius',
                socket_enabled: this.socket_enabled
            }
            if(window.localStorage) {
                window.localStorage.setItem('blender_opts',JSON.stringify(saveObject))
                this.$buefy.toast.open({
                    type:'is-succes',
                    message:'Successfullly saved settings'
                })
            }else{
                this.$buefy.toast.open({
                    type:'is-warning',
                    message:'Browser does not support saving to LocalStorage'
                })
            }
            this.$emit('save', saveObject);
            this.$parent.close()
        }
    },
    created() {
        this.temperature = this.default.use_celsius ? 'celsius' : 'fahrenheit';
        this.socket_enabled = this.default.socket_enabled
    }
}
</script>