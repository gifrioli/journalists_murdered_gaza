const mapContainer = d3.select(".map-container").node();
const width = mapContainer.clientWidth;
const height = mapContainer.clientHeight;

const svg = d3.select(mapContainer).select("svg")
    .attr("width", width)
    .attr("height", height);

const tooltip = d3.select(".tooltip");

// Define a projeção Mercator
const projection = d3.geoMercator()
    .scale(width / 6.5)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Escala de cor para mortes
const colorScale = d3.scaleLinear()
    .domain([0, 80, 160])
    .range(["white", d3.interpolateReds(0.8), "black"])
    .clamp(true);

// Inicializa o zoom do D3 com limites e evento
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

svg.call(zoom);

function zoomed(event) {
    svg.selectAll("path.country").attr("transform", event.transform);
}

// Parâmetros de tempo para o zoom programático
const ZOOM_DELAY = 3000;      // 1,5 segundos de espera antes do zoom
const ZOOM_DURATION = 5000;   // 7 segundos para fazer o zoom
const ZOOM_EASE = d3.easeCubicInOut; // Curva de animação suave

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"),
    d3.csv("places_most_death_2023_2025.csv")
]).then(([worldData, deathData]) => {
    const countries = topojson.feature(worldData, worldData.objects.countries).features;

    const nameCorrectionMap = {
        "Israel": "Israel and the Occupied Palestinian Territory"
    };

    const deathsMap = new Map(deathData.map(d => [d.country, +d.deaths]));

    function getDeathsForCountry(topoName) {
        const csvName = nameCorrectionMap[topoName] || topoName;
        return deathsMap.get(csvName);
    }

    // Desenha os países
    svg.selectAll("path.country")
        .data(countries)
        .join("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", d => {
            const val = getDeathsForCountry(d.properties.name);
            return val !== undefined ? colorScale(val) : "#eee";
        })
        .on("mousemove", (event, d) => {
            const topoName = d.properties.name;
            const csvName = nameCorrectionMap[topoName] || topoName;
            const val = getDeathsForCountry(topoName) || 0;

            tooltip.style("display", "block")
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px")
                .html(`<strong>${csvName}</strong><br/>Deaths: ${val}`);
        })
        .on("mouseout", () => tooltip.style("display", "none"));

    // Função para zoom suave e controlado em Israel/Gaza
    function zoomToIsraelGaza() {
        const targetCountryName = "Israel";
        const targetCountry = countries.find(d => d.properties.name === targetCountryName);

        if (targetCountry) {
            const bounds = path.bounds(targetCountry);
            const dx = bounds[1][0] - bounds[0][0];
            const dy = bounds[1][1] - bounds[0][1];
            const x = (bounds[0][0] + bounds[1][0]) / 2;
            const y = (bounds[0][1] + bounds[1][1]) / 2;
            const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
            const translate = [width / 2 - scale * x, height / 2 - scale * y];

            svg.transition()
                .delay(ZOOM_DELAY)
                .duration(ZOOM_DURATION)
                .ease(ZOOM_EASE)
                .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        } else {
            console.warn("País 'Israel' não encontrado no TopoJSON para zoom.");
        }
    }

    zoomToIsraelGaza();

    // Título do mapa
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("font-weight", "bold")
        .text("Journalists killed worldwide between 2023 and 2025");

    // Legenda
    const legendData = [0, 20, 40, 80, 120, 160];

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, ${height - 180})`);

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => colorScale(d));

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 24)
        .attr("y", (d, i) => i * 20 + 9)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(d => d === 160 ? `> ${d} deaths` : `${d} deaths`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Incidence of Deaths");

}).catch(error => {
    console.error("Error loading data:", error);
});
