// Custom CSS goes into a <style> element: strip anything that could close it or pull external resources.
export const safeCss=(css:string)=>css.replace(/</g,'').replace(/@import[^;]*;?/gi,'').replace(/url\s*\(/gi,'none(').replace(/expression\s*\(/gi,'none(');
