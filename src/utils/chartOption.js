export const showLabel = {
    label: {
        show: true,
        position: 'insideTop',
        color: '#fff',
        formatter: function (params) {
            return params.value == 0 ? '' : params.value;
        }
    }
}