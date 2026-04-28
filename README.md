# Sezzle Calculator

A simple calculator app that works like those pocket calculators of yore. It's composed of a backend built in Go, which exposes an endpoint for performing calculations, and a frontend, built in React, that handles the interactivity with the user.

## Setup Instuctions

### Using Docker

#### Development

To fire the entire application using a single command, please run:

```sh
make dev
```

This will start both the frontend and backend servers, both of which  include hot reloading to whatch for any changes in the code, and thus not needing to rebuild the image every time.

The applications run in the following addresses:

* Frontend: **http://localhost:5173/**
* Backend: **http://localhost:8080/**


#### Production

To deploy both the frontend and backend containers at the same time do:

```sh
make prod-up
```

This will start the entire application using the files currently present in the repository. To stop the image, you need to run this command:

```sh
make prod-down
```

### Without Docker

To run the applications without Docker, you need the following installed on your computer

- Go 1.26+
- Node.js 22+
- npm
 
To run the frontend do

```
cd frontend/calculator
npm run dev
```

To run the backend using the hotreloader, make sure you have air installed and run:

```
cd backend
air -c .air.toml
```

Otherwise you can run it using:

```
cd backend
go run main.go
```

## API Examples


Addition:

```sh
curl -X POST http://localhost:8080/calculate \
	-H "Content-Type: application/json" \
	-d '{"operand1":"12","operator":"+","operand2":"7"}'
```

Square root:

```sh
curl -X POST http://localhost:8080/calculate \
	-H "Content-Type: application/json" \
	-d '{"operand1":"9","operator":"sqrt"}'
```

Example success response:

```json
{"result":"19"}
```

Example error response:

```json
{"error":"Division by zero"}
```

## Design Decisions

Both of the components work independently from eachother. So the backend could be serving multiple clients who differ from each other, not necesarially tied to this single calculator frontend. 

The frontend consumes from the backend trhough API calles, making it stateless and its footprint small.

### Backend

The backend exposes a single endpoint called `/calculate`. This endpoint is very simple as it only perform one operation per call. This choice was done due to the restrictions in time for the development of this project. If wanted, the backend could be expanded to handle abritrary strings, and thus parsing the input and then performing calculations on it.

It also formats the numbers in case they are too large using scientific notation. If the number is outside of range, it will return an error. 

For building the webserver I decided to use Gin, a popular Go web framework that simplyfies the process of developing backend applications, and is very fast.

### Frontend

The frontend exposes three main components:

1. Calculator: This one is the core of the frontend application, it handles the functionality such as input, api calls and output. It has trhee different parts: the screen, where the current input is displayed, next to the working operation; the buttons and lastly a pop up that is shown when the backend returns an error. 

2. Buttons: A very simple button, that receives a label, a callback, which type it is and an test id.

3. Pop-up: it shows when the backend answers with an error status. It can be hidden by the user or it han hid itself after a little bit.

To perform a calculation, the user simply inputs a number and depending if it then chooses a unary or binary operation, it will call the api right away, or wait for another number. The calculator can only perform a single calculation at a time.


## Coverage

To run both coverage reports from the repository root:

```sh
make coverage
```

Run each side separately:

```sh
make coverage-backend
make coverage-frontend
```

Generated reports:

- Backend summary profile: `backend/coverage/coverage.out`
- Backend HTML report: `backend/coverage/index.html`
- Frontend HTML report: `frontend/calculator/coverage/index.html`

You can also run the commands directly:

```sh
cd backend && mkdir -p coverage && go test ./... -covermode=atomic -coverprofile=coverage/coverage.out && go tool cover -func=coverage/coverage.out && go tool cover -html=coverage/coverage.out -o coverage/index.html
cd frontend/calculator && npm run test:coverage
```

In a production application, these shouldn't be added to the git tree, but I'm adding them here for ilustrative purposes.s


## Prompts used

I use AI as a helper rather than just letting it run on its own. So my prompts to it are of the form:

> Do this boring task for me

Or

> How can I do X on React/Go

Jesus Pelay
