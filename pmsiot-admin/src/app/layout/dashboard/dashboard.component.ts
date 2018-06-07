import { Component, OnInit } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { DataService } from '../../shared/services/data.service';
import { GoogleMapsAPIWrapper, MapsAPILoader, AgmMap, LatLngBounds, LatLngBoundsLiteral} from '@agm/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { Paho } from 'ng2-mqtt/mqttws31';

declare var google: any;

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    animations: [routerTransition()]
})
export class DashboardComponent implements OnInit {
    
    private _client: Paho.MQTT.Client;
    isLiveTrackerOn = false;
    modalRef: NgbModalRef;
    closeResult: string;
    defaultOptions = {
        lat: 28.53590728969859,
        lng: 77.3436963558197,
        zoom: 17,
        polygonLat: 0,
        polygonLng: 0,
        isPolygonOpen: false
    };

    messageObj = {
        id: null,
        type: null,
        titleText: null,
        messageText: null
    };
    
    successMsg = '';
    showSending = false;
    searchKey = null;
    locationHistory = [];
    userMap;
    markerUrl: string = 'assets/images/marker-person.png';
    markerUrlOffline: string = 'assets/images/marker-person.png';
    markers = [];
    boundaries = [];

    constructor(private dataService: DataService, 
                    private loader: MapsAPILoader,
                        private modalService: NgbModal) {
    }

    ngOnInit() {
        this.getAllUsers();
        this.getLocations();
    }

    /**
     * get all user locations
     */
    getAllUsers() {
        this.searchKey = '';
        this.locationHistory = [];
        this.dataService.getAllUsers()
                            .subscribe((response) => {
                                if (response.status == 'Success') {
                                    this.markers = response.data;
                                    this.userMap.fitBounds(this.findStoresBounds());
                                }
                            });
    }

   

    /**
     * method to get all geofence locations
     */
    getLocations() {
        this.dataService.getGeoFenceLocations()
                    .subscribe((response) => {
                        if (response.status == 'Success') {
                            this.loadBoundaries(response.data);
                        }
                    });
    }

    /**
     * load geofence in map
     */
    loadBoundaries(data) {
        this.loader.load().then(() => {

            let boundaries = [];

            for (var i = 0; i < data.length; i++) {

                let arr = data[i].boundary;                
                
                boundaries[i] = { 
                            id: data[i].id,
                            points: [], 
                            title: data[i].name, 
                            capacity: data[i].capacity
                        };
                
                arr.forEach((element, index) => {
                    let posData = { lat: element.latitude, lng: element.longitude };
                    boundaries[i]['points'].push(posData);
                });

            }

            this.boundaries = boundaries;
            
        });

    }

    /**
     * Adjust popup position on polygon clicked
     * @param event 
     * @param polygon 
     */
    polygonClicked(event, polygon) {
        this.defaultOptions.polygonLat = Number(event.latLng.lat());
        this.defaultOptions.polygonLng = Number(event.latLng.lng());
        this.defaultOptions.isPolygonOpen = true;
    }

    /**
     * Update status of isOpen object
     */
    updateState() {
        this.defaultOptions.isPolygonOpen = false;
    }

    /**
     * Search user based on SAP ID
     */
    searchUser(map) {

        if (this.searchKey == '') {
            alert('Please enter SAP ID');
        } else {
            this.dataService.getUserById(this.searchKey)
                                    .subscribe((response) => {
                                        if (response.status == 'Success') {
                                            this.markers = [];
                                            this.markers.push(response.data);
                                            this.locationHistory = response.data.locationHistory;
                                            this.userMap.fitBounds(this.findStoresBounds());
                                            this.defaultOptions.zoom = 16.9;
                                        }
                                    });
        }
    }

    /**
     * Initialize userMap Object
     * @param map 
     */
    public userMapReady(map){
        this.userMap = map;
    }
    
    /**
     * Adjust map bounds
     */
    public findStoresBounds(){
        let bounds:LatLngBounds = new google.maps.LatLngBounds();
        for(let marker of this.markers){
          bounds.extend(new google.maps.LatLng(marker.latitude, marker.longitude));
        }
        
        return bounds;
    }

    /**
     * Open popup for message/notification
     */
    openMessageModal(content, titleText, type, id) {
        if (type == 'boundary') {
            this.messageObj.titleText = `Premises: ${titleText}`;
        } else {
            this.messageObj.titleText = `SAP ID: ${titleText}`;
        }

        this.messageObj.type = type;
        this.messageObj.id = id;
        
        this.modalRef = this.modalService.open(content);
    }

    /**
     * Send notification message
     */
    sendMessage() {

        this.showSending = true;
        this.dataService.sendNotification(this.messageObj)
                                    .subscribe((response) => {
                                        if (response.status == 'Success') {
                                            this.messageObj = {
                                                id: null,
                                                type: null,
                                                titleText: null,
                                                messageText: null
                                            };

                                            this.showSending = false;
                                            this.successMsg = 'Notification sent successfully.';

                                            setTimeout(() => {
                                                this.successMsg = '';
                                            }, 3000);
                                        }
                                    });
        
    }

    /**
     * Start live user location tracking
     * @param content 
     * @param userId 
     * @param index 
     */
    trackUser(content, userId, index) {
        this._client = new Paho.MQTT.Client("host", 80, "", "123");
    
        this._client.onConnectionLost = (responseObject: Object) => {
            console.log('Connection lost.');
        };
        
        this._client.onMessageArrived = (message: Paho.MQTT.Message) => {
            console.log('Message arrived.');
            let msg = JSON.parse(message.payloadString);
            this.markers[index].latitude = msg.data.latitude;
            this.markers[index].latitude = msg.data.longitude;
        };
        
        this._client.connect({ onSuccess: () => {
            this._client.subscribe('user/'+ userId, {});   
            this.isLiveTrackerOn = true;    
        }});
    }

    /**
     * Stop user tracking
     */
    stopTracking() {
        this._client.disconnect();
        this.isLiveTrackerOn = false;    
    }
    

}
