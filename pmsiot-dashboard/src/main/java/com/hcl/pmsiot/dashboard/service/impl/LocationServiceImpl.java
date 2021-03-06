package com.hcl.pmsiot.dashboard.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.hcl.pmsiot.dashboard.dao.LocationDetailDao;
import com.hcl.pmsiot.dashboard.dao.UserDetailDao;
import com.hcl.pmsiot.dashboard.data.BoundaryData;
import com.hcl.pmsiot.dashboard.data.LocationDetailData;
import com.hcl.pmsiot.dashboard.exception.DashboardException;
import com.hcl.pmsiot.dashboard.model.Boundary;
import com.hcl.pmsiot.dashboard.model.LocationDetail;
import com.hcl.pmsiot.dashboard.model.UserDetail;
import com.hcl.pmsiot.dashboard.service.LocationService;
import com.hcl.pmsiot.dashboard.util.DashboardUtil;

@Service
public class LocationServiceImpl implements LocationService {

	@Autowired
	LocationDetailDao locationDetailDao;

	@Autowired
	UserDetailDao userDetailDao;

	@Override
	public List<LocationDetailData> getAllLocation() {

		List<LocationDetail> ldList = locationDetailDao.getAllLocation();
		List<LocationDetailData> ldDataList = new ArrayList<>();
		if (ldList != null && ldList.size() > 0) {
			ldList.forEach(locationDetail -> {
				BoundaryData boundList[] = new BoundaryData[locationDetail.getBoudary().length];
				for (int i = 0; i < locationDetail.getBoudary().length; i++) {
					Boundary boundary = locationDetail.getBoudary()[i];
					boundList[i] = (new BoundaryData(boundary.getLatitude(), boundary.getLongitude()));
				}
				ldDataList.add(new LocationDetailData.LocationDetailBuilder().
						setLocationId(locationDetail.getLocationId()).setCapacity(locationDetail.getCapacity())
						.setLatitude(locationDetail.getLatitude()).setLongitude(locationDetail.getLongitude())
						.setMaster(locationDetail.isMaster()).setName(locationDetail.getName()).setBoudary(boundList).getLocationDetailData());
			});
		}
		return ldDataList;
	}

	@Override
	public int noOfUserInLocation(String locationId) {

		List<UserDetail> presentUsers = getUsersInLocation(locationId);

		return presentUsers == null ? 0 : presentUsers.size();

	}

	private List<UserDetail> getUsersInLocation(String locationId) {
		LocationDetail locationDetail = locationDetailDao.getLocationById(locationId);
		if (locationDetail == null)
			throw new DashboardException("No location found with id " + locationId);
		List<UserDetail> userDetailList = userDetailDao.getAllUsers();

		List<UserDetail> presentUsers = null;
		if (userDetailList != null)
			presentUsers = userDetailList.stream()
					.filter(ud -> DashboardUtil.containsLocation(Arrays.asList(locationDetail.getBoudary()),
							ud.getLatitude(), ud.getLongitude(), true))
					.collect(Collectors.toList());
		return presentUsers;
	}
}
