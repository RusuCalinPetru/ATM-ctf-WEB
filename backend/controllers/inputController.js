const ObjectId = require("mongoose").Types.ObjectId;
//primire gestionare cereri de la client
exports.validateRequestBody = function(body, validationObject) {
    for (const [key, validation] of Object.entries(validationObject)) {
      const value = body[key];
      if (validation.required && (value === undefined || value === '')) {
        throw new Error(`${key} este obligatoriu`);
      }
      if (validation.type === 'number' && isNaN(value)) {
        throw new Error(`${key} trebuie sa fie un numar`);
      }
      if (validation.type === 'positiveNumber' && (isNaN(value) || parseInt(value) < 0)) {
        throw new Error(`${key} trebuie sa fie un numar pozitiv`);
      }
      if (validation.type === 'objectId' && (value !== '' && !ObjectId.isValid(value))) {
        throw new Error(`${key} trebuie sa fie un ObjectId valid`);
      }
      if (validation.type === 'array') {
        const parsedArray = JSON.parse(value);
        parsedArray.forEach((item, index) => {
          for (const [itemKey, itemValidation] of Object.entries(validation.itemValidation)) {
            const itemValue = item[itemKey];
            if (itemValidation.required && (itemValue === undefined || itemValue === '')) {
              throw new Error(`Elementul ${index} din ${key} trebuie sa aiba ${itemKey} definit`);
            }
            if (itemValidation.type === 'number' && isNaN(itemValue)) {
              throw new Error(`Elementul ${index} din ${key} ${itemKey} trebuie sa fie un numar`);
            }
            if (itemValidation.type === 'positiveNumber' && (isNaN(itemValue) || parseInt(itemValue) < 0)) {
              throw new Error(`Elementul ${index} din ${key} ${itemKey} trebuie sa fie un numar pozitiv`);
            }
          }
        });
      }
    }
  }