export const showLabel = {
    label: {
        show: true,
        position: 'inside',
        color: '#fff',
        formatter: function (params) {
            return params.value == 0 ? '' : params.value;
        }
    }
}