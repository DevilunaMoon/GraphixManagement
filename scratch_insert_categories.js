const fs = require('fs');
const path = require('path');

const targetFile = 'apps/web/app/AdminSide/AdminInventory.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

const targetStr = `        </div>
      </div>

      {/* Inventory Table Card */}`;

const replacementStr = `        </div>
      </div>

      {/* Categories Section */}
      <section className={\`bg-white/95 rounded-xl p-5 md:p-8 shadow-sm border-2 \${styles.borderMain} flex flex-col gap-4 w-full mb-2 transition-colors duration-300\`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg text-gray-500 font-bold uppercase tracking-wide m-0 border-none">Categories</h2>
        </div>
        
        <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 scrollbar-hide">
          <div 
            onClick={() => setSelectedCategory('All')}
            className="flex flex-col items-center gap-3 min-w-[80px] sm:min-w-[100px] cursor-pointer group"
          >
            <div className={\`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-50 flex items-center justify-center shadow-sm border \${selectedCategory === 'All' ? 'border-[#bd00ff] shadow-md' : 'border-gray-200'} group-hover:border-[#bd00ff] group-hover:shadow-md transition-all ease-out duration-300 p-4\`}>
              <span className={\`text-xs font-bold \${selectedCategory === 'All' ? 'text-[#bd00ff]' : 'text-gray-400'}\`}>All</span>
            </div>
            <span className={\`text-xs sm:text-sm font-semibold text-center transition-colors leading-tight \${selectedCategory === 'All' ? 'text-[#bd00ff]' : 'text-gray-700 group-hover:text-[#bd00ff]'}\`}>
              All Categories
            </span>
          </div>

          {categories.map((category, idx) => (
            <div 
              key={category.id || idx} 
              onClick={() => setSelectedCategory(category.id)}
              className="flex flex-col items-center gap-3 min-w-[80px] sm:min-w-[100px] cursor-pointer group"
            >
              <div className={\`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-50 flex items-center justify-center shadow-sm border \${selectedCategory === category.id ? 'border-[#bd00ff] shadow-md' : 'border-gray-200'} group-hover:border-[#bd00ff] group-hover:shadow-md transition-all ease-out duration-300 p-4\`}>
                {category.logoUrl || (category as any).logo ? (
                  <img 
                    src={category.logoUrl || (category as any).logo} 
                    alt={category.name} 
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    style={category.name === 'Apple' ? { paddingBottom: '2px' } : {}}
                  />
                ) : (
                  <span className={\`text-xs font-bold \${selectedCategory === category.id ? 'text-[#bd00ff]' : 'text-gray-400'}\`}>No Img</span>
                )}
              </div>
              <span className={\`text-xs sm:text-sm font-semibold text-center transition-colors leading-tight \${selectedCategory === category.id ? 'text-[#bd00ff]' : 'text-gray-700 group-hover:text-[#bd00ff]'}\`}>
                {category.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Inventory Table Card */}`;

content = content.replace(/\r\n/g, '\n');
const targetReplaced = targetStr.replace(/\r\n/g, '\n');

if (content.includes(targetReplaced)) {
  content = content.replace(targetReplaced, replacementStr);
  fs.writeFileSync(targetFile, content);
  console.log("Successfully added Categories section to AdminInventory.");
} else {
  console.log("Error: Target string not found.");
}
