<template>
<div class="box">
    <h3 class='title is-3'>Download ZIPs <a @click='refresh' class="button is-info is-pulled-right"><b-icon icon="refresh"></b-icon><span>Refresh</span></a></h3>
    <hr>
    <b-table
    :data="list"
    striped
    hoverable
    narrowed
    :loading="loading"
    >

        <template slot-scope="props">
            <b-table-column field="name" label="Name">
                {{ props.row.name }}
            </b-table-column>

            <b-table-column field="size" label="Size">
                {{ props.row.size | humanize }}
            </b-table-column>

            <b-table-column field="date" label="Last Modified">
                {{ props.row.date }}
            </b-table-column>

            <b-table-column label="Action">
                <div class="buttons">
                <b-button @click="downloadZip(props.row.name)" type="is-primary"  icon-left="download" icon-size="large" />
                <b-button  @click="deleteZip(props.row.name)" type="is-danger"  icon-left="delete" />
                </div>
            </b-table-column>

        </template>


        <template slot="empty">
            <section class="section">
                <div class="content has-text-grey has-text-centered">
                    <p>
                        <b-icon
                            icon="emoticon-sad"
                            size="is-large">
                        </b-icon>
                    </p>
                    <p>No ZIPs were found.</p>
                </div>
            </section>
        </template>
    </b-table>
</div>
</template>

<script>
export default {
    props: ['server'],
    data() {
        return {
            loading: true,
            list: [],
            tokens: {}
        }
    },
    methods: {
        refresh() {
            this.loading = true;
            this.$http.get('/api/zips')
            .then(response => {
                this.list = response.data.files
            })
            .catch(err => {
                this.$buefy.snackbar.open({
                    message: 'Failed to fetch list of ZIPs: ' + err.response.status,
                    type: 'is-danger',
                    hasIcon: true,
                    icon: 'alert-circle'
                })
            })
            .finally(() =>  this.loading = false)
        },
        downloadZip(name) {
            //this.downloading = true;
            if(this.tokens[name]) {
                const url = `${this.server.address}/api/zips/${encodeURIComponent(name)}/download?token=${this.tokens[name]}`
                this.$buefy.dialog.alert({
                    type: 'is-success',
                    message: `<a href='${url}'>${url}</a>`,
                    title: `Download ${name}`
                })
            }else{
                this.$http.post(`/api/zips/${encodeURIComponent(name)}/token`)
                .then(response => {
                    const url = `${this.server.address}/api/zips/${encodeURIComponent(name)}/download?token=${response.data.token}`
                    this.$buefy.dialog.alert({
                        type: 'is-success',
                        message: `<a href='${url}'>${url}</a>`,
                        title: `Download ${name}`
                    })
                    this.tokens[name] = response.data.token
                })
                .catch(err => {
                    this.$buefy.dialog.alert({
                        title: 'Download Failure',
                        message: 'Could not acquire a download token for this file. <b>Server returned:</b> ' + err.response?err.response.data.error||JSON.stringify(err.response.data):err.message,
                        type: 'is-danger',
                        hasIcon: true,
                        icon: 'alert-circle'
                    })
                })
            }
        },
        deleteZip(name) {
            this.$buefy.dialog.confirm({
                title: 'Deleting ZIP',
                message: `Are you sure you want to delete <b>${name}</b>?`,
                confirmText: 'Delete',
                type: 'is-warning',
                hasIcon: true,
                onConfirm: () => {
                    this.$http.delete(`/api/zips/${encodeURIComponent(name)}`)
                    .then(() => {
                        this.$buefy.toast.open({
                            type: 'is-success',
                            message: `Deleted file ${name}`
                        })
                        const index = this.list.findIndex(v => v.name === name)
                        if(index >= 0) this.list.splice(index, 1);
                    }).catch(err => {
                        console.log(err.data)
                        this.$buefy.dialog.alert({
                            title: 'Delete Failed',
                            message: '<b>Server returned:</b> ' + err.response?err.response.data.error||JSON.stringify(err.response.data):err.message,
                            type: 'is-danger',
                            hasIcon: true,
                            icon: 'alert-circle'
                        })
                    })
                }
            })
            
        },
    },
    mounted() {
        console.log(this.server)
        this.refresh()
    }
}
</script>

<style scoped>
td {
    vertical-align: middle;
}
</style>

