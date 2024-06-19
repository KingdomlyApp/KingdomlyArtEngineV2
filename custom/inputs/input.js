"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayersInput = void 0;
const fs = require("fs");
class LayersInput {
    layersPath;
    layerConfigurations;
    constructor(layersPath, layerConfigurations) {
        this.layersPath = layersPath;
        this.layerConfigurations = layerConfigurations;
    }
    async init(props) { }
    getElements = (path) => {
        return fs.readdirSync(path).filter((item) => !/(^|\/)\.[^\/\.]/g.test(item)).map((i, index) => {
            if (i.includes("-")) {
                throw new Error(`layer name can not contain dashes, please fix: ${i}`);
            }
            return {
                id: index,
                name: i.slice(0, -4),
                filename: i,
                path: `${path}/${i}`
            };
        });
    };
    async load() {
        let layers = [];
        var index = 0;
        for (var layerInd in this.layerConfigurations) {
            for (var i in this.layerConfigurations[layerInd].layersOrder) {
                layers[index] = {
                    kind: this.layerConfigurations[layerInd].editionName,
                    id: +i,
                    elements: this.getElements(`${this.layersPath}/${this.layerConfigurations[layerInd].editionName}/${this.layerConfigurations[layerInd].layersOrder[i].name}`),
                    name: this.layerConfigurations[layerInd].layersOrder[i].name
                };
                index++;
            }
        }
        // const layers: LayerInterface[] = this.layersOrder.map((layerObj, index) => ({
        //   id: index,
        //   elements: this.getElements(`${this.layersPath}/${this.editionName}/${layerObj.name}`),
        //   name: layerObj.name
        // }));
        return layers;
    }
}
exports.LayersInput = LayersInput;
