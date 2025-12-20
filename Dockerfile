# node 20 ka lightweight alpine image use kar rahe hain
FROM node:20-alpine

# container ke andar working directory set kar rahe hain
WORKDIR /usr/src/app

# package.json aur package-lock.json copy kar rahe hain
# taaki dependencies install ki jaa sakein
COPY package*.json ./

# npm dependencies install kar rahe hain
RUN npm install

# poora source code container me copy kar rahe hain
COPY . .

# TypeScript code ko JavaScript me build kar rahe hain
RUN npm run build

# container ke bahar port 8000 expose kar rahe hain
EXPOSE 8000

# container start hone par application run karne ka command
CMD ["npm", "start"]
