<template>
<div class="box">
    <h3 class='title is-3'>Render Settings</h3>
    <hr>
    <b-field label="Python Scripts (Optional)">
        <b-taginput :disabled="render.active"
            v-model="options.python_scripts"
            placeholder="Comma-separated list of files"
            type="is-dark">
        </b-taginput>
    </b-field>
    <b-field label="Extra Command Arguments (Optional)" v-if="serverSettings.extraShellArgs">
        <b-input
        v-model="options.extra_arguments" 
        disabled 
        />
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
    props: ['settings', 'serverSettings', 'render'],
    data() {
        return {
            options: this.settings
        }
    },
    methods: {
        save() {
            this.$emit('save', this.options)
            this.$parent.close()
        }
    },
    created() {
        this.temperature = this.default.use_celsius ? 'celsius' : 'fahrenheit';
        this.socket_enabled = this.default.socket_enabled
    }
}
</script>