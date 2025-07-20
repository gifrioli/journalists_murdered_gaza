// Function to fetch and parse XLSX data
async function loadXLSX(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Assuming the data is in the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array. By default, it uses the first row as headers.
        // Ensure header row is correctly identified.
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Basic validation for data structure
        if (data.length === 0) {
            console.warn("No data found in the XLSX file or headers are incorrect.");
            return [];
        }
        if (!data[0].Nome || !data[0]['Data da Morte']) {
            console.error("XLSX headers 'Nome' or 'Data da Morte' not found or incorrectly parsed. Please ensure the first row of your Excel sheet contains these exact headers.");
            return [];
        }

        return data;
    } catch (error) {
        console.error("Error loading or parsing XLSX data:", error);
        return []; // Return empty array on error
    }
}

// Load data for journalists killed in Gaza
loadXLSX("journalists_killed_gaza_2023_2025.xlsx").then(data => { // Updated filename here
    // Log the loaded data to the console for debugging
    console.log("Loaded Gaza journalists data:", data);

    // If no data is loaded, stop execution
    if (data.length === 0) {
        console.warn("No data available to render the Gaza journalists chart.");
        return;
    }

    // Select the container for the new chart
    const container = d3.select(".gaza-deaths-container").node();
    const width = container.clientWidth; // Use container width
    
    // Define icon size and padding for a grid layout
    const iconSize = 45; // Desired size for each icon
    const padding = 8; // Adjusted padding for better spacing
    const iconsPerRow = 14; // Set to 14 icons per row as requested

    // Calculate height dynamically based on the number of icons and icons per row
    const numRows = Math.ceil(data.length / iconsPerRow);
    const height = numRows * (iconSize + padding) + padding; // Dynamic height

    // Select the SVG element within the container
    const svg = d3.select(".gaza-chart-svg")
        .attr("width", width)
        .attr("height", height); // Set dynamic height

    // Select the tooltip element for this chart
    const tooltip = d3.select(".gaza-tooltip");

    // Ensure the tooltip has a high z-index to appear on top
    tooltip.style("z-index", 1000); 

    // Define the SVG path data for the journalist icon
    // This array holds the 'd' attributes for each path in your provided SVG icon
    const journalistIconPaths = [
        "M148.228,301.059c-46.104,21.473-82.004,59.252-101.087,106.378c-1.555,3.839,0.297,8.212,4.137,9.767c0.922,0.374,1.875,0.55,2.813,0.55c2.965,0,5.773-1.77,6.954-4.687c17.653-43.596,50.865-78.545,93.517-98.411c3.755-1.749,5.381-6.21,3.632-9.965C156.444,300.936,151.983,299.31,148.228,301.059z",
        "M417.859,407.437c-19.082-47.121-54.977-84.897-101.073-106.371c-3.755-1.75-8.216-0.124-9.966,3.631c-1.749,3.755-0.123,8.216,3.632,9.965c42.645,19.866,75.852,54.813,93.504,98.404c1.181,2.917,3.988,4.687,6.954,4.687c0.937,0,1.89-0.177,2.813-0.55C417.561,415.649,419.414,411.276,417.859,407.437z",
        "M359.725,127.782C359.725,57.323,302.403,0,231.944,0c-70.459,0-127.782,57.323-127.782,127.782c0,42.514,21.059,82.123,56.333,105.954c1.288,0.87,2.747,1.286,4.192,1.286c2.407,0,4.772-1.157,6.222-3.302c2.319-3.433,1.416-8.095-2.016-10.414c-31.139-21.037-49.73-56-49.73-93.524C119.162,65.594,169.756,15,231.944,15s112.782,50.594,112.782,112.782c0,36.677-17.937,71.188-47.98,92.318c-3.389,2.383-4.203,7.061-1.82,10.449c2.383,3.387,7.062,4.204,10.449,1.82C339.407,208.434,359.725,169.335,359.725,127.782z",
        "M283.62,271.492h-15.457c6.778-9.777,9.966-24.55,9.966-45.87c0-25.156-20.466-45.622-45.622-45.622s-45.622,20.466-45.622,45.622c0,21.32,3.188,36.093,9.966,45.87h-15.457c-4.142,0-7.5,3.358-7.5,7.5v88.116c0,4.142,3.358,7.5,7.5,7.5h43.613V457.5c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-82.892h43.612c4.143,0,7.5-3.358,7.5-7.5v-88.116C291.12,274.85,287.762,271.492,283.62,271.492z M201.886,225.622c0-16.885,13.737-30.622,30.622-30.622c16.885,0,30.622,13.737,30.622,30.622c0,45.87-15.567,45.87-30.622,45.87C217.452,271.492,201.886,271.492,201.886,225.622z M276.12,359.608h-87.226v-73.116h87.226V359.608z"
    ];

    // Calculate the total width needed for one row of icons
    const totalIconsWidth = iconsPerRow * (iconSize + padding) - padding;
    // Calculate the horizontal offset to center the icons
    const xOffset = (width - totalIconsWidth) / 2;

    // Create a group for each journalist
    const journalistGroups = svg.selectAll(".journalist-group")
        .data(data)
        .enter()
        .append("g") // Append a group for each journalist
        .attr("class", "journalist-group")
        .attr("transform", (d, i) => {
            // Apply the xOffset to center the row
            const x = xOffset + (i % iconsPerRow) * (iconSize + padding) + padding;
            const y = Math.floor(i / iconsPerRow) * (iconSize + padding) + padding;
            const scaleFactor = iconSize / 465; // Scale from original viewBox (465x465) to iconSize
            return `translate(${x},${y}) scale(${scaleFactor})`;
        })
        .on("mousemove", (event, d) => { // Show tooltip on mouseover
            // Directly use the 'Data da Morte' value, as it's now just the year
            const yearOfDeath = d['Data da Morte']; 
            
            tooltip.style("display", "block")
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px")
                .html(`<strong>${d.Nome}</strong><br/>Year of Death: ${yearOfDeath}`); // Changed to "Year of Death" and use year string directly
        })
        .on("mouseout", () => tooltip.style("display", "none")); // Hide tooltip on mouseout

    // Append all paths of the icon within each journalist's group
    journalistGroups.each(function() {
        const group = d3.select(this);
        journalistIconPaths.forEach(pathData => {
            group.append("path")
                .attr("d", pathData)
                .attr("fill", "red") // Changed fill color to white
                .attr("class", "journalist-icon"); // Apply common class for styling
        });
    });

}).catch(error => {
    console.error("Error loading Gaza journalists data:", error);
});
