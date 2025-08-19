import React, { useState, useEffect, useMemo } from "react";
import { Map, Polygon } from "react-kakao-maps-sdk";
import "./KakaoMap.css";
import { guDongMap } from "../data/guDongMapWithCoords";
import { guList as seoulGuList } from "../data/guList";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

export default function KakaoMap() {
  const [searchText, setSearchText] = useState("");
  const [selectedGuId, setSelectedGuId] = useState(null);
  const [selectedDong, setSelectedDong] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: 37.566826,
    lng: 126.9786567,
  });
  const [guPolygons, setGuPolygons] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetch("/seoul_gu_polygons.json")
      .then((res) => res.json())
      .then((data) => setGuPolygons(data));
  }, []);

  // 검색창에서 동 검색 시 결과 생성
  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    const results = [];
    Object.entries(guDongMap).forEach(([guId, dongs]) => {
      dongs.forEach((dong) => {
        if (dong.label.includes(searchText.trim())) {
          const guInfo = seoulGuList.find((g) => g.id === guId);
          results.push({
            dongId: dong.id,
            dongLabel: dong.label,
            guId,
            guLabel: guInfo?.label,
            guLat: guInfo?.lat,
            guLng: guInfo?.lng,
          });
        }
      });
    });
    return results;
  }, [searchText]);

  // 패널에 보여줄 목록
  const shownItems = useMemo(() => {
    if (searchText.trim()) return searchResults; // 검색 중이면 검색 결과
    if (selectedGuId) return guDongMap[selectedGuId] ?? []; // 구 선택 후 동 목록
    return seoulGuList; // 기본 구 목록
  }, [searchText, selectedGuId, searchResults]);

  const selectedGuLabel = useMemo(() => {
    if (!selectedGuId) return "";
    const found = seoulGuList.find((g) => g.id === selectedGuId);
    return found?.label ?? "";
  }, [selectedGuId]);

  return (
    <div className="kmap-container">
      {/* 우측 상단 네비게이션 메뉴 */}
      <div className="kmap-nav">
        <nav className="kmap-navInner">
          <Link to="/">홈</Link>
          <Link to="/irq">업종추천</Link>
          <Link to="/gu">정책안내</Link>
        </nav>
      </div>

      {/* 지도 영역 */}
      <div className="kmap-mapWrapper">
        <Map center={mapCenter} className="kmap-map" level={8} draggable={true}>
          {guPolygons.map((gu) => (
            <Polygon
              key={gu.id}
              path={gu.polygon}
              strokeColor="#0278AE"
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor={selectedGuId === gu.id ? "#EF476F" : "#cce6ff"}
              fillOpacity={0.5}
              onClick={() => {
                // 구 폴리곤 클릭
                setSelectedGuId(gu.id);
                setSelectedDong(null);
                setSearchText("");
                const guInfo = seoulGuList.find((g) => g.id === gu.id);
                if (guInfo?.lat && guInfo?.lng) {
                  setMapCenter({ lat: guInfo.lat, lng: guInfo.lng });
                }
              }}
            />
          ))}
        </Map>
      </div>

      {/* 패널 */}
      <div className="kmap-panel">
        {/* 검색창 */}
        <div className="kmap-searchRow">
          <input
            className="kmap-searchInput"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="동 검색"
          />
          <button className="kmap-searchBtn" type="button">
            🔍
          </button>
        </div>

        <div className="kmap-desc">
          {selectedGuId
            ? "아래 동을 선택 또는 지도에서 선택해주세요."
            : "검색어를 입력하거나 구를 선택해주세요."}
        </div>
        <div className="kmap-title">
          {selectedGuId
            ? "분석할 동을 선택해주세요"
            : "분석할 구를 선택해주세요"}
        </div>

        {/* 목록 버튼 */}
        <div className="kmap-list">
          {shownItems.map((item) => {
            const key = item.dongId ?? item.id;
            const label = item.dongLabel ?? item.label;
            const isSelected = selectedDong?.id === key;

            return (
              <button
                key={key}
                type="button"
                className={`kmap-itemBtn ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  if (!selectedGuId && item.guId) {
                    // 검색 결과에서 동 클릭
                    setSelectedGuId(item.guId);
                    setSelectedDong({ id: item.dongId, label: item.dongLabel });
                    setSearchText("");
                    if (item.guLat && item.guLng)
                      setMapCenter({ lat: item.guLat, lng: item.guLng });
                  } else if (selectedGuId) {
                    // 구 선택 후 동 클릭
                    setSelectedDong({ id: key, label });
                    const found = guDongMap[selectedGuId]?.find(
                      (d) => d.id === key
                    );
                    if (found?.lat && found?.lng)
                      setMapCenter({ lat: found.lat, lng: found.lng });
                  } else {
                    // 구 버튼 클릭
                    setSelectedGuId(item.id);
                    setSelectedDong(null);
                    setSearchText("");
                    if (item.lat && item.lng)
                      setMapCenter({ lat: item.lat, lng: item.lng });
                  }
                }}
              >
                {label} {item.guLabel ? `(${item.guLabel})` : ""}
              </button>
            );
          })}
        </div>

        {/* 이전 페이지 버튼 */}
        {selectedGuId && (
          <div className="kmap-backRow">
            <button
              className="kmap-backBtn"
              type="button"
              onClick={() => {
                setSelectedGuId(null);
                setSelectedDong(null);
                setSearchText("");
                setMapCenter({ lat: 37.566826, lng: 126.9786567 });
              }}
            >
              이전 페이지로 돌아가기
            </button>
          </div>
        )}
      </div>

      {/* 분석 리포트 카드 */}
      {selectedGuId && selectedDong && (
        <div className="kmap-confirmWrap">
          <div className="kmap-confirmCard">
            <div className="kmap-confirmTitle">{`서울특별시 ${selectedGuLabel} ${selectedDong.label}`}</div>
            <div className="kmap-confirmDesc">
              상권 분석 리포트를 작성해드릴까요?
            </div>
            <div className="kmap-confirmButtons">
              <button
                className="kmap-primaryBtn"
                type="button"
                onClick={() =>
                  navigate("/re", {
                    state: { guId: selectedGuId, dongId: selectedDong.id },
                  })
                }
              >
                네, 작성해주세요.
              </button>
              <button
                className="kmap-secondaryBtn"
                type="button"
                onClick={() => {
                  setSelectedGuId(null);
                  setSelectedDong(null);
                  setSearchText("");
                  setMapCenter({ lat: 37.566826, lng: 126.9786567 });
                }}
              >
                아니요, 다시 선택할래요.
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
