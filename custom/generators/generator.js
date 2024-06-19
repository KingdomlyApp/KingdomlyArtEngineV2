"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerator = void 0;
class ImageGenerator {
    dataKey;
    layerConfigurations;
    inputsManager;
    constructor(dataKey, layerConfigurations) {
        this.dataKey = dataKey;
        this.layerConfigurations = layerConfigurations;
    }
    async init(props) {
        this.inputsManager = props.inputsManager;
    }
    getAssets = (dna, inputsData) => {
        const assets = [];
        for (var index in dna) {
            assets.push({
                path: inputsData[index].elements[dna[index]].path,
                layername: inputsData[index].name,
                value: inputsData[index].elements[dna[index]].name
            });
        }
        return assets;
    };
    async generate() {
        let items = {};
        const inputsData = this.inputsManager.get(this.dataKey);
        let layerInputs = [];
        var index = 0;
        for (var layerInd in this.layerConfigurations) {
            layerInputs = inputsData.filter((item) => item.kind === this.layerConfigurations[layerInd].editionName);
            for (var i in this.layerConfigurations[layerInd].dnaList) {
                items[index] = [{
                        kind: "ImageGenerator@v1",
                        data: {
                            id: +index + 1,
                            assets: this.getAssets(this.layerConfigurations[layerInd].dnaList[i], layerInputs)
                        }
                    }];
                index++;
            }
        }
        return items;
    }
}
exports.ImageGenerator = ImageGenerator;
