#!/bin/bash
ant -Dapp.proxy.geoserver=http://geoserver-agri:8080/geoserver/ -Dapp.port=8081 debug
