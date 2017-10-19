/*jshint node: true, esversion: 6*/
'use strict';

const fs = require('fs');

const Pack = require('./package');

const Hapi = require('hapi');
const Good = require('good');
const Boom = require('boom');
const Joi = require('joi');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');

const jwt = require('jsonwebtoken');

const server = new Hapi.Server();
server.connection({ port: 8000, host: 'localhost' });

server.route({
    method: 'POST',
    path: '/v1/jwt-generator',
    config: {
        tags: ['api'],
        validate: {
            payload: {
                attributes: Joi.object().required(),
                certificate: Joi.string().required(),
                parameters: Joi.object({
                    algorithm: Joi.string().valid('RS256').required(),
                    expiresIn: Joi.string().required(),
                    notBefore: Joi.string().required()
                })
            }
        }
    },
    handler: function (request, reply) {

        const certName = './certificates/' + request.payload.certificate + '.pem';

        fs.readFile(certName , null, function(err, certificate) {

            if (err) {

                reply(Boom.internal('Certificate not found'));

            } else {

                const cert = {
                    key: certificate
                };

                const options = {
                    algorithm: request.payload.parameters.algorithm,
                    expiresIn: request.payload.parameters.expiresIn,
                    notBefore: request.payload.parameters.notBefore
                };

                reply({'jwt': jwt.sign(request.payload.attributes, cert, options)});

            }
        });
    }
});

server.register([
    Inert,
    Vision,
    {
        register: HapiSwagger,
        options: {
            info: {
                'title': 'Test API Documentation',
                'version': Pack.version,
            }
        }
    },
    {
    register: Good,
    options: {
        reporters: {
            console: [{
                module: 'good-console'
            }, 'stdout']
        }
    }
}], (err) => {

    if (err) {
        throw err; // something bad happened loading the plugin
    }

    server.start((err) => {

        if (err) {
            throw err;
        }
        server.log('info', 'Server running at: ' + server.info.uri);
    });
});
